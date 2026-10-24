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
  const { PDFDocument, PDFString, rgb, StandardFonts } = pdfLib;
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
    // Word catalog text is dir="auto", but html2canvas draws with the COMPUTED direction, which stays the inherited one for such
    // blocks - so an English paragraph inside an Arabic quotation (or the reverse) was drawn with the wrong direction.
    // Resolve every dir="auto" to what the browser would pick (first strong letter) before anything is measured.
    doc.querySelectorAll<HTMLElement>('[dir="auto"]').forEach((el) => {
      const first = (el.textContent ?? '').match(/[A-Za-zÀ-ɏ֐-ࣿיִ-﷿ﹰ-ﻼ]/)?.[0];
      if (first) el.dir = /[֐-ࣿיִ-﷿ﹰ-ﻼ]/.test(first) ? 'rtl' : 'ltr';
    });
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
    // material links (a.lnk): the picture of the page is not clickable, so a link area is added on top of each one afterwards
    const linkBoxes = [...doc.querySelectorAll<HTMLAnchorElement>('a.lnk')].flatMap((a) =>
      /^https?:\/\//i.test(a.href) ? [...a.getClientRects()].map((r) => ({ url: a.href, left: r.left, top: Math.round(r.top + scrollY), width: r.width, height: r.height })) : []);
    // y positions where a page may break: bottoms of table rows / blocks. Where a page MUST break: a new catalog part / a catalog PDF.
    const breaks = [...doc.querySelectorAll('tr, .term, .box, p, h2, h3, .catalog-heading, .catalog-image')].map(bottomOf).sort((a, b) => a - b);
    const forced = [...[...doc.querySelectorAll('.catalog-index, .catalog-page')].map(topOf), ...slotYs].sort((a, b) => a - b);

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const mmPerPx = bodyMm / contentW;
    const pagePx = (297 - topMm - bottomMm) / mmPerPx;
    const slotsAfter: { page: number; index: number }[] = [];
    const pageRanges: { start: number; end: number }[] = [];
    const pending = slotYs.map((y, index) => ({ y, index }));
    let pageCount = 0;
    let y = 0;
    // 1) decide where every page starts and ends (geometry only, nothing is drawn yet)
    while (y < total - 2) {
      let end = Math.min(y + pagePx, total);
      const must = forced.find((b) => b > y + 1 && b < end);
      if (must) {
        end = must;
      } else if (end < total) {
        const cut = [...breaks].reverse().find((b) => b > y + pagePx * 0.4 && b <= end);
        if (cut) end = cut;
      }
      pageCount++;
      pageRanges.push({ start: y, end });
      while (pending.length && pending[0].y <= end + 1) slotsAfter.push({ page: pageCount, index: pending.shift()!.index });
      y = end;
    }
    pending.forEach((p) => slotsAfter.push({ page: pageCount, index: p.index })); // (a PDF at the very end)

    // 2) rasterise a few pages at a time at a FIXED scale. The whole quotation used to be drawn on ONE canvas whose scale was
    // reduced (down to well below 1x) to stay under the browser's canvas size limit - on a long quotation with several catalog
    // files that made the text blurry and mangled the joined Arabic letters and the spaces between words. Foreign-object
    // rendering also lets the browser's text engine handle Arabic shaping and bidirectional text instead of drawing word by word.
    const SCALE = 2;
    const CHUNK_PX = 6000; // css px per canvas (x SCALE stays far below the ~16000px canvas limit)
    for (let first = 0; first < pageRanges.length; ) {
      let last = first;
      while (last + 1 < pageRanges.length && pageRanges[last + 1].end - pageRanges[first].start <= CHUNK_PX) last++;
      const chunkTop = pageRanges[first].start;
      const chunk = await html2canvas(doc.body, {
        scale: SCALE, x: 0, y: chunkTop, width: contentW, height: pageRanges[last].end - chunkTop,
        windowWidth: contentW, windowHeight: total, scrollX: 0, scrollY: 0, backgroundColor: '#ffffff', useCORS: true,
        foreignObjectRendering: true,
      });
      for (let k = first; k <= last; k++) {
        const { start, end } = pageRanges[k];
        const h = end - start;
        const slice = document.createElement('canvas');
        slice.width = chunk.width;
        slice.height = Math.max(1, Math.min(chunk.height - Math.round((start - chunkTop) * SCALE), Math.round(h * SCALE)));
        slice.getContext('2d')!.drawImage(chunk, 0, Math.round((start - chunkTop) * SCALE), chunk.width, slice.height, 0, 0, chunk.width, slice.height);
        if (k > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', side, topMm, bodyMm, h * mmPerPx);
        slice.width = slice.height = 0; // release the memory right away
      }
      chunk.width = chunk.height = 0;
      first = last + 1;
    }

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

    const addLinks = (page: PdfPage, baseIndex: number) => {
      const range = pageRanges[baseIndex];
      if (!range) return;
      const pxToPt = mmPerPx * MM;
      for (const l of linkBoxes) {
        if (l.top < range.start - 1 || l.top >= range.end) continue;
        const x = side * MM + l.left * pxToPt;
        const w = l.width * pxToPt;
        const h = Math.min(l.height, range.end - l.top) * pxToPt;
        const yTop = A4_H - (topMm * MM + (l.top - range.start) * pxToPt);
        const annot = out.context.obj({
          Type: 'Annot', Subtype: 'Link', Rect: [x, yTop - h, x + w, yTop], Border: [0, 0, 0],
          A: { Type: 'Action', S: 'URI', URI: PDFString.of(l.url) },
        });
        page.node.addAnnot(out.context.register(annot));
      }
    };

    const addQuotationPages = async (from: number, to: number) => {
      if (to <= from) return;
      const indices = Array.from({ length: to - from }, (_, i) => from + i);
      (await out.copyPages(base, indices)).forEach((p, k) => { out.addPage(p); stamp(p); addLinks(p, indices[k]); });
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
