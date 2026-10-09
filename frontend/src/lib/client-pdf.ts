/**
 * Browser-side PDF for hosts where Chromium can't run (cPanel shared hosting).
 * Takes the server's self-contained /print HTML (fonts + logo inlined, so Arabic shapes correctly),
 * renders it in a hidden iframe, rasterises it and slices it into A4 pages at row boundaries.
 */
const CONTENT_W = 718; // 190mm @96dpi (A4 minus 10mm side margins)
const PAGE_H = 1024; // 271mm @ the same scale (A4 minus 12mm top / 14mm bottom)

export async function htmlToPdfBlob(html: string): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

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
    doc.body.style.margin = '0';
    doc.body.style.width = `${CONTENT_W}px`;
    iframe.style.height = `${doc.documentElement.scrollHeight}px`;

    const total = doc.documentElement.scrollHeight;
    // y positions where a page may break: bottoms of table rows / blocks
    const breaks = [...doc.querySelectorAll('tr, .term, .box, section')]
      .map((el) => Math.round(el.getBoundingClientRect().bottom + doc.defaultView!.scrollY))
      .sort((a, b) => a - b);

    const scale = 2;
    const canvas = await html2canvas(doc.body, { scale, width: CONTENT_W, windowWidth: CONTENT_W, backgroundColor: '#ffffff', useCORS: true });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const mmPerPx = 190 / CONTENT_W;
    let y = 0;
    while (y < total) {
      let end = Math.min(y + PAGE_H, total);
      if (end < total) {
        const cut = [...breaks].reverse().find((b) => b > y + PAGE_H * 0.4 && b <= end);
        if (cut) end = cut;
      }
      const h = end - y;
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.round(h * scale);
      slice.getContext('2d')!.drawImage(canvas, 0, Math.round(y * scale), canvas.width, slice.height, 0, 0, canvas.width, slice.height);
      if (y > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 12, 190, h * mmPerPx);
      y = end;
    }
    const pages = pdf.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      pdf.setPage(p);
      pdf.setFontSize(8);
      pdf.setTextColor(102);
      pdf.text(`${p} / ${pages}`, 105, 290, { align: 'center' });
    }
    return pdf.output('blob');
  } finally {
    iframe.remove();
  }
}
