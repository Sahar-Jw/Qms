import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { PdfService } from './pdf.service';

// a real 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

describe('printed quotation: company header and footer images', () => {
  const svc = new PdfService({ get: () => undefined } as any, { map: async () => ({}) } as any);
  let dir: string;
  const prevDir = process.env.UPLOADS_DIR;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qms-uploads-'));
    fs.mkdirSync(path.join(dir, 'letterheads'));
    fs.mkdirSync(path.join(dir, 'materials'));
    fs.writeFileSync(path.join(dir, 'letterheads', 'head.png'), PNG);
    fs.writeFileSync(path.join(dir, 'letterheads', 'foot.png'), PNG);
    fs.writeFileSync(path.join(dir, 'materials', `catalog-${'a'.repeat(32)}.png`), PNG);
    fs.writeFileSync(path.join(dir, 'materials', `catalog-${'b'.repeat(32)}.pdf`), '%PDF-1.4 test');
    process.env.UPLOADS_DIR = dir;
  });
  afterAll(() => {
    if (prevDir === undefined) delete process.env.UPLOADS_DIR; else process.env.UPLOADS_DIR = prevDir;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const quotation = (company: Record<string, unknown> = {}, items: unknown[] = []) =>
    ({
      id: 1, quotationNumber: 'Q-1', quotationDate: '2026-10-11', status: 'draft',
      company: { id: 1, name: 'Acme', logo: null, address: 'Damascus', phone: '1', email: 'a@b.c', website: null, headerImage: null, footerImage: null, ...company },
      customer: { id: 1, companyName: 'Client', managerName: null, phone: [], email: null, country: null },
      responsibleUser: null, customerPaymentMethod: null, bankName: null, validity: null, deliveryTime: null,
      paymentMethod: null, paymentLocation: null, deliveryMethod: null, notes: null, items, totals: [],
    }) as any;

  const withImages = { headerImage: 'letterheads/head.png', footerImage: 'letterheads/foot.png' };
  const tag = (html: string, cls: string) => html.match(new RegExp(`<img class="${cls}"[^>]*>`))?.[0];

  it.each(['ar', 'en'] as const)('prints the header and footer images in the %s file', async (lang) => {
    const html = await svc.renderHtml(quotation(withImages), { lang, includeCost: false });
    expect(tag(html, 'cohead')).toMatch(/src="data:image\/png;base64,/);
    expect(tag(html, 'cofoot')).toMatch(/src="data:image\/png;base64,/);
  });

  it('the header and footer are identical in both languages and the heading follows the document direction', async () => {
    const ar = await svc.renderHtml(quotation(withImages), { lang: 'ar', includeCost: false });
    const en = await svc.renderHtml(quotation(withImages), { lang: 'en', includeCost: false });
    expect(tag(ar, 'cohead')).toBe(tag(en, 'cohead'));
    expect(tag(ar, 'cofoot')).toBe(tag(en, 'cofoot'));
    expect(ar).toContain('<html lang="ar" dir="rtl"');
    expect(ar).toContain('body { direction: rtl;');
    expect(ar).toContain('<div class="title" dir="rtl">عرض سعر</div>');
    expect(en).toContain('<div class="title" dir="ltr">Quotation</div>');
    expect(ar).toMatch(/\.title \{[^}]*letter-spacing:\s*normal;/);
    expect(en).toMatch(/\.title \{[^}]*letter-spacing:\s*0\.2px;/);
  });

  it('the pictures are pinned outside the page content, so what is written can never move or cover them', async () => {
    const html = await svc.renderHtml(quotation(withImages), { lang: 'en', includeCost: false });
    const content = html.indexOf('<td class="pgbody">');
    expect(html.indexOf('class="cohead"')).toBeLessThan(content);
    expect(html.indexOf('class="cofoot"')).toBeLessThan(content);
    expect(html).toContain('<div class="title" dir="ltr">Quotation</div>');
  });

  it('keeps a manual print button available if automatic printing is blocked', async () => {
    const html = await svc.renderHtml(quotation(), { lang: 'ar', includeCost: false, autoPrint: true });
    expect(html).toContain('<button onclick="window.print()">طباعة</button>');
    expect(html).toContain('document.fonts.ready.then');
    expect(html).toContain('window.print()');
  });

  it.each(['ar', 'en'] as const)('prints the material name independently from its link in %s', async (lang) => {
    const html = await svc.renderHtml(quotation({}, [{
      materialCode: 'M-1',
      materialName: 'مضخة مياه',
      materialLink: null,
      quantity: '1',
      unit: 'pcs',
      unitPrice: '10',
      priceCurrency: 'USD',
      amounts: [],
      catalogFiles: [],
    }]), { lang, includeCost: false });

    expect(html).toContain('<div class="material-name"><bdi dir="auto">مضخة مياه</bdi></div>');
    expect(html).not.toContain('class="lnk"');
    expect(html).toContain('unicode-bidi: plaintext');
  });

  it('prints a product link separately from the material name', async () => {
    const html = await svc.renderHtml(quotation({}, [{
      materialCode: 'M-1',
      materialName: 'Water pump',
      materialLink: 'https://example.com/pump',
      quantity: '1',
      unit: 'pcs',
      unitPrice: '10',
      priceCurrency: 'USD',
      amounts: [],
      catalogFiles: [],
    }]), { lang: 'en', includeCost: false });

    expect(html).toContain('<div class="material-name"><bdi dir="auto">Water pump</bdi></div>');
    expect(html).toContain('<a class="lnk" dir="ltr" href="https://example.com/pump">https://example.com/pump</a>');
  });

  it('pins compact company images to the very top and bottom edge of every printed page', async () => {
    const html = await svc.renderHtml(quotation(withImages), { lang: 'en', includeCost: false });
    expect(html).toContain('@page { size: A4; margin: 0; }'); // the page frame (spacer head / foot) keeps the content away from them
    expect(html).toMatch(/img\.cohead\s*\{[^}]*position:\s*fixed;[^}]*top:\s*5mm;[^}]*height:\s*13mm/);
    expect(html).toMatch(/img\.cofoot\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*7mm;[^}]*height:\s*10mm/);
    expect(html).not.toMatch(/(top|bottom):\s*-\d/); // no negative offsets: they land on the wrong page in Chromium
    expect(html).toContain('<thead><tr><td><div class="hs"></div></td></tr></thead><tfoot><tr><td><div class="fs"></div></td></tr></tfoot>');
    expect(html).toContain('data-top="21" data-bottom="19"');
  });

  it.each([['ar', 'rtl'], ['en', 'ltr']] as const)('the %s file is %s and carries the Cairo font (Arabic letters never fall back to ?)', async (lang, dir) => {
    const html = await svc.renderHtml(quotation(withImages), { lang, includeCost: false });
    expect(html).toContain(`<html lang="${lang}" dir="${dir}"`);
    expect(html).toContain("font-family:'Cairo'");
    expect(html).toMatch(/@font-face\{font-family:'Cairo'/);
  });

  it('a header image replaces the text letterhead (logo / name / address); without one the text letterhead stays', async () => {
    const withHead = await svc.renderHtml(quotation(withImages), { lang: 'en', includeCost: false });
    expect(withHead).not.toContain('<div class="head">');
    const without = await svc.renderHtml(quotation(), { lang: 'en', includeCost: false });
    expect(without).toContain('<div class="head">');
    expect(without).toContain('Damascus');
    expect(without).toContain('data-top="12" data-bottom="14"');
    expect(tag(without, 'cohead')).toBeUndefined();
    expect(tag(without, 'cofoot')).toBeUndefined();
  });

  it('a missing image file is skipped instead of breaking the print', async () => {
    const html = await svc.renderHtml(quotation({ headerImage: 'letterheads/gone.png', footerImage: 'letterheads/gone2.png' }), { lang: 'en', includeCost: false });
    expect(tag(html, 'cohead')).toBeUndefined();
    expect(tag(html, 'cofoot')).toBeUndefined();
    expect(html).toContain('<div class="head">');
  });

  it('adds a catalog list, the picture pages and a slot for the catalog PDF to the print page', async () => {
    const html = await svc.renderHtml(quotation({}, [{
      materialCode: 'M-1',
      materialName: 'Pump',
      catalogFiles: [
        { id: 'a'.repeat(32), name: 'photo.png', path: `materials/catalog-${'a'.repeat(32)}.png`, mimeType: 'image/png' },
        { id: 'b'.repeat(32), name: 'datasheet.pdf', path: `materials/catalog-${'b'.repeat(32)}.pdf`, mimeType: 'application/pdf' },
      ],
      amounts: [],
    }]), { lang: 'en', includeCost: false });

    expect(html).toContain('class="catalog-index"');
    expect(html).toContain('Attached catalogs');
    expect(html).toContain('M-1 - Pump');
    expect(html).toContain('<bdi dir="auto">photo.png</bdi>');
    expect(html).toContain('class="catalog-image" src="data:image/png;base64,');
    expect(html).toContain('class="pdf-slot" data-pdf-name="datasheet.pdf"'); // the PDF pages go here (browser PDF) - an <iframe> never prints
    expect(html).not.toContain('<iframe');
    expect(html).toContain('class="note pdf-note"'); // the browser print dialog cannot include PDF files
  });

  it('sanitizes converted Word content before printing', async () => {
    const html = (svc as any).sanitizeDocxHtml(
      '<p>Specs</p><a href="javascript:alert(1)">Link</a><script>alert(2)</script><img src="data:image/png;base64,AAAA" onerror="alert(3)">',
    );
    expect(html).toContain('<p dir="auto">Specs</p>');
    expect(html).toContain('data:image/png;base64,AAAA');
    expect(html).not.toMatch(/javascript:|<script|onerror=/);
  });

  it('merges PDF catalog files as pages after the quotation', async () => {
    const quotationPdf = await PDFDocument.create();
    quotationPdf.addPage();
    const quotationBytes = Buffer.from(await quotationPdf.save());
    const attachmentPdf = await PDFDocument.create();
    attachmentPdf.addPage();
    fs.writeFileSync(path.join(dir, 'materials', `catalog-${'e'.repeat(32)}.pdf`), Buffer.from(await attachmentPdf.save()));
    const page = {
      setContent: jest.fn(),
      evaluate: jest.fn(async (script: unknown) => (
        typeof script === 'string' && script.includes('toPng')
          ? {
            header: `data:image/png;base64,${PNG.toString('base64')}`,
            footer: `data:image/png;base64,${PNG.toString('base64')}`,
          }
          : undefined
      )),
      pdf: jest.fn(async () => quotationBytes),
      close: jest.fn(async () => undefined),
    };
    (svc as any).getBrowser = async () => ({ newPage: async () => page });
    const output = await svc.renderPdf(quotation(withImages, [{
      materialCode: 'M-1',
      materialName: 'Pump',
      catalogFiles: [{
        id: 'e'.repeat(32),
        name: 'datasheet.pdf',
        path: `materials/catalog-${'e'.repeat(32)}.pdf`,
        mimeType: 'application/pdf',
      }],
      amounts: [],
    }]), { lang: 'en', includeCost: false });

    const result = await PDFDocument.load(output);
    expect(result.getPageCount()).toBe(3);
    expect(output.toString('latin1')).toContain('/Subtype /Image');
    expect(page.setContent).toHaveBeenCalledWith(expect.stringContaining('class="cohead"'), { waitUntil: 'load' });
  });

  describe('table header and material link', () => {
    const item = (link: string | null) => ({
      id: 1, materialId: 1, materialCode: 'M1', materialName: 'Pipe', materialImage: null, materialLink: link, catalogFiles: [], unit: 'm', sortOrder: 0,
      quantity: '1', unitPrice: '2', priceCurrency: 'USD', unitCost: null, costCurrency: null, shippingCost: null, shippingCurrency: null,
      customsCost: null, customsCurrency: null, commissionPercentage: null, taxPercentage: '0', notes: null,
      amounts: [{ currency: 'USD', value: '2', cost: '0', shipping: '0', customs: '0', required: '2' }],
    });

    it('prints table headers in a light colour (saves ink)', async () => {
      const html = await svc.renderHtml(quotation({}, [item(null)]), { lang: 'en', includeCost: false });
      const rule = html.match(/\nth \{[^}]*\}/)?.[0] ?? '';
      expect(rule).toContain('background: #e9eef5');
      expect(rule).not.toContain('background: #1f3a5f');
      expect(rule).not.toMatch(/color:\s*#fff/);
    });

    it('prints the material link in its own table column', async () => {
      const html = await svc.renderHtml(quotation({}, [item('https://example.com/p?a=1&b=2')]), { lang: 'en', includeCost: false });
      expect(html).toContain('<th>Link</th>');
      expect(html).toContain('<td class="desc"><div class="material-name"><bdi dir="auto">Pipe</bdi></div></td>\n          <td class="link-cell"><a class="lnk" dir="ltr" href="https://example.com/p?a=1&amp;b=2">https://example.com/p?a=1&amp;b=2</a></td>');
    });

    it('prints no link when there is none or it is not http(s)', async () => {
      for (const link of [null, 'javascript:alert(1)', 'https://x.com/"><script>']) {
        const html = await svc.renderHtml(quotation({}, [item(link)]), { lang: 'en', includeCost: false });
        expect(html).not.toContain('class="lnk"');
      }
    });
  });
});
