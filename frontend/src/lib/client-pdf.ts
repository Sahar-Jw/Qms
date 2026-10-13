/**
 * Browser-side PDF for hosts where Chromium can't run (cPanel shared hosting).
 *
 * Takes the server's self-contained /print HTML (fonts + pictures inlined, so Arabic shapes correctly), lays it out in a hidden
 * iframe, rasterises it and cuts it into A4 pages at row boundaries. Then, with pdf-lib:
 *  - the company header / footer pictures are stamped at the very top / bottom edge of EVERY page (the numbers come from the
 *    data-* attributes of the print page, so they always match the server's PDF and the browser's print dialog),
 *  - the material catalog PDFs are placed where the print page has its `.pdf-slot` markers (Word files and pictures are already
 *    ordinary pages of the print page), scaled to fit between the header and the footer,
 *  - the page numbers are added.
 */
const MM = 72 / 25.4; // PDF points per millimetre
const A4_W = 595.28;
const A4_H = 841.89;

export async function htmlToPdfBlob(html: string, catalogPdfUrls: string[] = []): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }, pdfLib] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
    import('pdf-lib'),
  ]);
  const { PDFDocument, rgb, StandardFonts } = pdfLib;
  type Doc = import('pdf-lib').PDFDocument;
  type PdfPage = import('pdf-lib').PDFPage;
  type PdfImage = import('pdf-lib').PDFImage;

  // html2canvas draws text on a canvas of THIS page, and a canvas can only use fonts declared in the page that owns it.
  // The print page carries its own @font-face rules (inside the iframe), so declare them here too - without this the letters are
  // drawn with a fallback font while the layout was measured with Cairo, and the words lose their spaces.
  const fontStyle = document.createElement('style');
  fontStyle.textContent = (html.match(/@font-face\{[^}]*\}/g) ?? []).join('\n');
  document.head.appendChild(fontStyle);

  const clean = html
    .replace(/<div class="bar">[\s\S]*?<\/div>/, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<p class="note pdf-note">[\s\S]*?<\/p>/, ''); // "PDF files are not in the browser print" - they are in this one
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:718px;height:1200px;border:0;visibility:hidden';
  iframe.srcdoc = clean;
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((res) => { iframe.onload = () => res(); });
    const doc = iframe.contentDocument!;
    await Promise.all([
      doc.fonts.ready,
      ...['400', '700'].flatMap((w) => ['a', 'ع'].map((c) => document.fonts.load(`${w} 12px Cairo`, c).catch(() => []))),
    ]);
    await Promise.all([...doc.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));

    // page geometry, decided by the server (mm)
    const root = doc.documentElement;
    const num = (key: string, fallback: number) => {
      const v = root.dataset[key];
      return v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback;
    };
    const side = num('side', 10);
    const topMm = num('top', 12);
    const bottomMm = num('bottom', 14);
    const headTop = num('headTop', 5);
    const headMax = num('headMax', 13);
    const footBottom = num('footBottom', 7);
    const footMax = num('footMax', 10);
    const numberY = num('numberY', 3);
    const bodyMm = 210 - side * 2;
    const contentW = Math.round((bodyMm * 96) / 25.4);
    iframe.style.width = `${contentW}px`;

    const toPng = (selector: string): string | undefined => {
      const image = doc.querySelector<HTMLImageElement>(selector);
      if (!image || !image.naturalWidth) return undefined;
      const canvas = doc.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
      return canvas.toDataURL('image/png');
    };
    const companyHeader = toPng('img.cohead');
    const companyFooter = toPng('img.cofoot');

    // from here the page is laid out as one continuous sheet (the page frame and the pictures are handled below)
    root.classList.add('client');
    doc.body.style.margin = '0';
    doc.body.style.width = `${contentW}px`;
    await new Promise((r) => setTimeout(r, 50));
    const total = doc.documentElement.scrollHeight;
    iframe.style.height = `${total}px`;
    const scrollY = doc.defaultView!.scrollY;
    const topOf = (el: Element) => Math.round(el.getBoundingClientRect().top + scrollY);
    const bottomOf = (el: Element) => Math.round(el.getBoundingClientRect().bottom + scrollY);

    const slots = [...doc.querySelectorAll('.pdf-slot')];
    if (slots.length !== catalogPdfUrls.length) {
      throw new Error('Could not match all catalog PDF files to their place in the quotation');
    }
    const slotYs = slots.map(topOf);
    // y positions where a page may break: bottoms of table rows / blocks. Where a page MUST break: a new catalog part / a catalog PDF.
    const breaks = [...doc.querySelectorAll('tr, .term, .box, p, h2, h3, .catalog-heading, .catalog-image')].map(bottomOf).sort((a, b) => a - b);
    const forced = [...[...doc.querySelectorAll('.catalog-index, .catalog-page')].map(topOf), ...slotYs].sort((a, b) => a - b);

    const scale = Math.min(2, 14000 / total); // keep the canvas below the browser's size limit
    const canvas = await html2canvas(doc.body, { scale, width: contentW, windowWidth: contentW, backgroundColor: '#ffffff', useCORS: true });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const mmPerPx = bodyMm / contentW;
    const pagePx = (297 - topMm - bottomMm) / mmPerPx;
    const slotsAfter: { page: number; index: number }[] = [];
    const pending = slotYs.map((y, index) => ({ y, index }));
    let pageCount = 0;
    let y = 0;
    while (y < total - 2) {
      let end = Math.min(y + pagePx, total);
      const must = forced.find((b) => b > y + 1 && b < end);
      if (must) {
        end = must;
      } else if (end < total) {
        const cut = [...breaks].reverse().find((b) => b > y + pagePx * 0.4 && b <= end);
        if (cut) end = cut;
      }
      const h = end - y;
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.max(1, Math.round(h * scale));
      slice.getContext('2d')!.drawImage(canvas, 0, Math.round(y * scale), canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (pageCount > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', side, topMm, bodyMm, h * mmPerPx);
      pageCount++;
      while (pending.length && pending[0].y <= end + 1) slotsAfter.push({ page: pageCount, index: pending.shift()!.index });
      y = end;
    }
    pending.forEach((p) => slotsAfter.push({ page: pageCount, index: p.index })); // (a PDF at the very end)

    // ---- put everything together
    const base = await PDFDocument.load(await pdf.output('arraybuffer'));
    const out: Doc = await PDFDocument.create();
    const dataBytes = (uri: string) => Uint8Array.from(atob(uri.slice(uri.indexOf(',') + 1)), (c) => c.charCodeAt(0));
    const headImg: PdfImage | undefined = companyHeader ? await out.embedPng(dataBytes(companyHeader)) : undefined;
    const footImg: PdfImage | undefined = companyFooter ? await out.embedPng(dataBytes(companyFooter)) : undefined;

    const stamp = (page: PdfPage) => {
      const { width, height } = page.getSize();
      const boxW = width - side * 2 * MM;
      const place = (img: PdfImage, boxBottom: number, boxH: number) => {
        const s = Math.min(boxW / img.width, boxH / img.height);
        page.drawImage(img, { x: (width - img.width * s) / 2, y: boxBottom + (boxH - img.height * s) / 2, width: img.width * s, height: img.height * s });
      };
      if (headImg) place(headImg, height - (headTop + headMax) * MM, headMax * MM);
      if (footImg) place(footImg, footBottom * MM, footMax * MM);
    };

    const addQuotationPages = async (from: number, to: number) => {
      if (to <= from) return;
      const indices = Array.from({ length: to - from }, (_, i) => from + i);
      (await out.copyPages(base, indices)).forEach((p) => { out.addPage(p); stamp(p); });
    };

    const addCatalogPdf = async (url: string) => {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error(`Could not download catalog PDF (${response.status})`);
      const attachment = await PDFDocument.load(new Uint8Array(await response.arrayBuffer()));
      for (const source of attachment.getPages()) {
        const page = out.addPage([A4_W, A4_H]);
        if (source.node.Contents()) {
          const embedded = await out.embedPage(source);
          const boxW = A4_W - side * 2 * MM;
          const boxH = A4_H - (topMm + bottomMm) * MM;
          const s = Math.min(boxW / embedded.width, boxH / embedded.height);
          page.drawPage(embedded, {
            x: (A4_W - embedded.width * s) / 2,
            y: bottomMm * MM + (boxH - embedded.height * s) / 2,
            width: embedded.width * s,
            height: embedded.height * s,
          });
        }
        stamp(page);
      }
    };

    let cursor = 0;
    for (const { page, index } of slotsAfter.sort((a, b) => a.page - b.page || a.index - b.index)) {
      await addQuotationPages(cursor, page);
      cursor = page;
      await addCatalogPdf(catalogPdfUrls[index]);
    }
    await addQuotationPages(cursor, pageCount);

    const font = await out.embedFont(StandardFonts.Helvetica);
    const pages = out.getPages();
    pages.forEach((p, i) => {
      const label = `${i + 1} / ${pages.length}`;
      p.drawText(label, { x: A4_W / 2 - font.widthOfTextAtSize(label, 8) / 2, y: numberY * MM, size: 8, font, color: rgb(0.4, 0.44, 0.5) });
    });
    const merged = await out.save();
    const bytes = new Uint8Array(merged.byteLength);
    bytes.set(merged);
    return new Blob([bytes.buffer], { type: 'application/pdf' });
  } finally {
    iframe.remove();
    fontStyle.remove();
  }
}
