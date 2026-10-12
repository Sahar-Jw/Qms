/**
 * Browser-side PDF for hosts where Chromium can't run (cPanel shared hosting).
 * Takes the server's self-contained /print HTML (fonts + logo inlined, so Arabic shapes correctly),
 * renders it in a hidden iframe, rasterises it and slices it into A4 pages at row boundaries.
 */
const CONTENT_W = 718; // 190mm @96dpi (A4 minus 10mm side margins)

export async function htmlToPdfBlob(html: string, catalogPdfUrls: string[] = []): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }, pdfLib] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
    import('pdf-lib'),
  ]);
  const { PDFDocument, rgb, StandardFonts } = pdfLib;

  const clean = html.replace(/<div class="bar">[\s\S]*?<\/div>/, '').replace(/<script[\s\S]*?<\/script>/g, '');
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${CONTENT_W}px;height:1200px;border:0;visibility:hidden`;
  iframe.srcdoc = clean;
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((res) => { iframe.onload = () => res(); });
    const doc = iframe.contentDocument!;
    await doc.fonts.ready;
    await Promise.all([...doc.images].map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    const pdfUrls = catalogPdfUrls;
    const toPng = (selector: string): string | undefined => {
      const image = doc.querySelector<HTMLImageElement>(selector);
      if (!image) return undefined;
      const canvas = doc.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext('2d')!.drawImage(image, 0, 0);
      return canvas.toDataURL('image/png');
    };
    const companyHeader = toPng('img.cohead');
    const companyFooter = toPng('img.cofoot');
    const pageTopMargin = companyHeader ? 23 : 12;
    const pageBottomMargin = companyFooter ? 20 : 14;
    const pageHeight = (297 - pageTopMargin - pageBottomMargin) * CONTENT_W / 190;
    const pdfFrames = [...doc.querySelectorAll<HTMLIFrameElement>('.catalog-page iframe')];
    if (pdfFrames.length !== pdfUrls.length) {
      throw new Error('Could not match all catalog PDF pages to their attachment headings');
    }
    const coverCanvases = await Promise.all(pdfFrames.map((pdfFrame) => {
      const heading = pdfFrame.parentElement?.querySelector<HTMLElement>('.catalog-heading');
      if (!heading) throw new Error('A catalog PDF is missing its attachment heading');
      return html2canvas(heading, {
        scale: 2,
        width: CONTENT_W,
        windowWidth: CONTENT_W,
        backgroundColor: '#ffffff',
      });
    }));
    doc.querySelectorAll('img.cohead, img.cofoot').forEach((img) => img.remove());
    pdfFrames.forEach((pdfFrame) => pdfFrame.closest('.catalog-page')?.remove());
    doc.body.style.margin = '0';
    doc.body.style.width = `${CONTENT_W}px`;
    iframe.style.height = `${doc.documentElement.scrollHeight}px`;

    const total = doc.documentElement.scrollHeight;
    // y positions where a page may break: bottoms of table rows / blocks
    const breaks = [...doc.querySelectorAll('tr, .term, .box, section')]
      .map((el) => Math.round(el.getBoundingClientRect().bottom + doc.defaultView!.scrollY))
      .sort((a, b) => a - b);
    const attachmentStarts = [...doc.querySelectorAll('.catalog-page')]
      .map((el) => Math.round(el.getBoundingClientRect().top + doc.defaultView!.scrollY))
      .sort((a, b) => a - b);

    const scale = 2;
    const canvas = await html2canvas(doc.body, { scale, width: CONTENT_W, windowWidth: CONTENT_W, backgroundColor: '#ffffff', useCORS: true });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const mmPerPx = 190 / CONTENT_W;
    let y = 0;
    while (y < total) {
      let end = Math.min(y + pageHeight, total);
      const attachmentStart = attachmentStarts.find((start) => start > y + 1 && start < end);
      if (attachmentStart) {
        end = attachmentStart;
      } else if (end < total) {
        const cut = [...breaks].reverse().find((b) => b > y + pageHeight * 0.4 && b <= end);
        if (cut) end = cut;
      }
      const h = end - y;
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.round(h * scale);
      slice.getContext('2d')!.drawImage(canvas, 0, Math.round(y * scale), canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (y > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 10, pageTopMargin, 190, h * mmPerPx);
      if (companyHeader) addCompanyImage(pdf, companyHeader, 16, 3);
      if (companyFooter) addCompanyImage(pdf, companyFooter, 12, 5, true);
      y = end;
    }

    function addCompanyImage(
      pdf: import('jspdf').jsPDF,
      source: string,
      maxHeight: number,
      edgeOffset: number,
      fromBottom = false,
    ): void {
      const { width: sourceWidth, height: sourceHeight } = pdf.getImageProperties(source);
      const aspectRatio = sourceWidth / sourceHeight;
      const width = Math.min(190, maxHeight * aspectRatio);
      const height = width / aspectRatio;
      const top = fromBottom ? 297 - edgeOffset - height : edgeOffset;
      pdf.addImage(source, 10 + (190 - width) / 2, top, width, height);
    }
    const output = await PDFDocument.load(await pdf.output('arraybuffer'));
    const headerImage = companyHeader
      ? await output.embedPng(decodeDataUri(companyHeader))
      : undefined;
    const footerImage = companyFooter
      ? await output.embedPng(decodeDataUri(companyFooter))
      : undefined;
    for (const [index, url] of pdfUrls.entries()) {
      await appendCatalogCover(output, coverCanvases[index], headerImage, footerImage, rgb);
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error(`Could not download catalog PDF (${response.status})`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const attachment = await PDFDocument.load(bytes);
      if (!headerImage && !footerImage) {
        const pages = await output.copyPages(attachment, attachment.getPageIndices());
        pages.forEach((page) => output.addPage(page));
      } else {
        await appendStampedPdf(output, attachment, headerImage, footerImage, rgb);
      }
    }
    const pages = output.getPages();
    const pageNumberFont = await output.embedFont(StandardFonts.Helvetica);
    pages.forEach((page, index) => {
      const { width } = page.getSize();
      const label = `${index + 1} / ${pages.length}`;
      page.drawText(label, {
        x: width / 2 - pageNumberFont.widthOfTextAtSize(label, 8) / 2,
        y: 7,
        size: 8,
        font: pageNumberFont,
        color: rgb(0.4, 0.44, 0.5),
      });
    });
    const mergedBytes = await output.save();
    const blobBytes = new Uint8Array(mergedBytes.byteLength);
    blobBytes.set(mergedBytes);
    return new Blob([blobBytes.buffer], { type: 'application/pdf' });
  } finally {
    iframe.remove();
  }

  function decodeDataUri(dataUri: string): Uint8Array {
    const encoded = dataUri.slice(dataUri.indexOf(',') + 1);
    return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  }

  async function appendCatalogCover(
    output: import('pdf-lib').PDFDocument,
    canvas: HTMLCanvasElement,
    headerImage: import('pdf-lib').PDFImage | undefined,
    footerImage: import('pdf-lib').PDFImage | undefined,
    makeColor: typeof import('pdf-lib').rgb,
  ): Promise<void> {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const branded = createBrandedPage(output, pageWidth, pageHeight, headerImage, footerImage, makeColor);
    const coverImage = await output.embedPng(decodeDataUri(canvas.toDataURL('image/png')));
    const { sideMargin, headerBand, footerBand, page } = branded;
    const bodyWidth = pageWidth - sideMargin * 2;
    const bodyHeight = pageHeight - headerBand - footerBand;
    const scale = Math.min(bodyWidth / coverImage.width, bodyHeight / coverImage.height);
    const width = coverImage.width * scale;
    const height = coverImage.height * scale;
    page.drawImage(coverImage, {
      x: (pageWidth - width) / 2,
      y: footerBand + bodyHeight - height - 18,
      width,
      height,
    });
  }

  async function appendStampedPdf(
    output: import('pdf-lib').PDFDocument,
    source: import('pdf-lib').PDFDocument,
    headerImage: import('pdf-lib').PDFImage | undefined,
    footerImage: import('pdf-lib').PDFImage | undefined,
    makeColor: typeof import('pdf-lib').rgb,
  ): Promise<void> {
    const ptPerMm = 72 / 25.4;
    for (const sourcePage of source.getPages()) {
      const embedded = sourcePage.node.Contents() ? await output.embedPage(sourcePage) : undefined;
      const { width, height } = sourcePage.getSize();
      const branded = createBrandedPage(output, width, height, headerImage, footerImage, makeColor);
      const { page, sideMargin, headerBand, footerBand } = branded;

      const bodyWidth = width - sideMargin * 2;
      const bodyHeight = height - headerBand - footerBand;
      if (embedded) {
        const scale = Math.min(bodyWidth / embedded.width, bodyHeight / embedded.height);
        const scaledWidth = embedded.width * scale;
        const scaledHeight = embedded.height * scale;
        page.drawPage(embedded, {
          x: sideMargin + (bodyWidth - scaledWidth) / 2,
          y: footerBand + (bodyHeight - scaledHeight) / 2,
          width: scaledWidth,
          height: scaledHeight,
        });
      }
    }
  }

  function createBrandedPage(
    output: import('pdf-lib').PDFDocument,
    width: number,
    height: number,
    headerImage: import('pdf-lib').PDFImage | undefined,
    footerImage: import('pdf-lib').PDFImage | undefined,
    makeColor: typeof import('pdf-lib').rgb,
  ) {
    const ptPerMm = 72 / 25.4;
    const sideMargin = Math.min(10 * ptPerMm, width * 0.12);
    const headerBand = headerImage ? Math.min(23 * ptPerMm, height * 0.25) : 0;
    const footerBand = footerImage ? Math.min(20 * ptPerMm, height * 0.22) : 0;
    const page = output.addPage([width, height]);
    const ruleColor = makeColor(0.85, 0.88, 0.92);
    if (headerBand) {
      page.drawRectangle({ x: 0, y: height - headerBand, width, height: headerBand, color: makeColor(1, 1, 1) });
      page.drawLine({
        start: { x: sideMargin, y: height - headerBand },
        end: { x: width - sideMargin, y: height - headerBand },
        thickness: 0.5,
        color: ruleColor,
      });
      drawPdfPageImage(page, headerImage!, width, height - headerBand, headerBand, sideMargin, ptPerMm * 16);
    }
    if (footerBand) {
      page.drawRectangle({ x: 0, y: 0, width, height: footerBand, color: makeColor(1, 1, 1) });
      page.drawLine({
        start: { x: sideMargin, y: footerBand },
        end: { x: width - sideMargin, y: footerBand },
        thickness: 0.5,
        color: ruleColor,
      });
      drawPdfPageImage(page, footerImage!, width, 0, footerBand, sideMargin, ptPerMm * 12);
    }
    return { page, sideMargin, headerBand, footerBand };
  }

  function drawPdfPageImage(
    page: import('pdf-lib').PDFPage,
    image: import('pdf-lib').PDFImage,
    pageWidth: number,
    bandBottom: number,
    bandHeight: number,
    sideMargin: number,
    maxHeight: number,
  ): void {
    const maxWidth = pageWidth - sideMargin * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, bandHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: bandBottom + (bandHeight - height) / 2,
      width,
      height,
    });
  }
}
