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

  it('the header and footer are identical in both languages; only the quotation words change', async () => {
    const ar = await svc.renderHtml(quotation(withImages), { lang: 'ar', includeCost: false });
    const en = await svc.renderHtml(quotation(withImages), { lang: 'en', includeCost: false });
    expect(tag(ar, 'cohead')).toBe(tag(en, 'cohead'));
    expect(tag(ar, 'cofoot')).toBe(tag(en, 'cofoot'));
    expect(ar).toContain('عرض سعر');
    expect(en).toContain('Quotation');
  });

  it('header image sits above the title; footer image after the totals', async () => {
    const html = await svc.renderHtml(quotation(withImages), { lang: 'en', includeCost: false });
    expect(html.indexOf('class="cohead"')).toBeLessThan(html.indexOf('class="title"'));
    expect(html.indexOf('class="cofoot"')).toBeGreaterThan(html.indexOf('class="totals"'));
  });

  it('pins compact company images to the top and bottom of every printed page', async () => {
    const html = await svc.renderHtml(quotation(withImages), { lang: 'en', includeCost: false });
    expect(html).toContain('@page { size: A4; margin: 23mm 10mm 20mm; }');
    expect(html).toMatch(/img\.cohead\s*\{[^}]*max-height:\s*16mm/);
    expect(html).toMatch(/img\.cofoot\s*\{[^}]*max-height:\s*12mm/);
    expect(html).toMatch(/img\.cohead\s*\{[^}]*position:\s*fixed;[^}]*top:\s*-19mm/);
    expect(html).toMatch(/img\.cofoot\s*\{[^}]*position:\s*fixed;[^}]*bottom:\s*-17mm/);
  });

  it('a header image replaces the text letterhead (logo / name / address); without one the text letterhead stays', async () => {
    const withHead = await svc.renderHtml(quotation(withImages), { lang: 'en', includeCost: false });
    expect(withHead).not.toContain('<div class="head">');
    const without = await svc.renderHtml(quotation(), { lang: 'en', includeCost: false });
    expect(without).toContain('<div class="head">');
    expect(without).toContain('Damascus');
    expect(without).toContain('@page { size: A4; margin: 12mm 10mm 14mm; }');
    expect(tag(without, 'cohead')).toBeUndefined();
    expect(tag(without, 'cofoot')).toBeUndefined();
  });

  it('a missing image file is skipped instead of breaking the print', async () => {
    const html = await svc.renderHtml(quotation({ headerImage: 'letterheads/gone.png', footerImage: 'letterheads/gone2.png' }), { lang: 'en', includeCost: false });
    expect(tag(html, 'cohead')).toBeUndefined();
    expect(tag(html, 'cofoot')).toBeUndefined();
    expect(html).toContain('<div class="head">');
  });

  it('includes material catalog images and PDFs in the print-ready appendix', async () => {
    const html = await svc.renderHtml(quotation({}, [{
      materialCode: 'M-1',
      materialName: 'Pump',
      catalogFiles: [
        { id: 'a'.repeat(32), name: 'photo.png', path: `materials/catalog-${'a'.repeat(32)}.png`, mimeType: 'image/png' },
        { id: 'b'.repeat(32), name: 'datasheet.pdf', path: `materials/catalog-${'b'.repeat(32)}.pdf`, mimeType: 'application/pdf' },
      ],
      amounts: [],
    }]), { lang: 'en', includeCost: false });

    expect(html).toContain('data:image/png;base64,');
    expect(html).toContain('src="/uploads/materials/catalog-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf"');
    expect(html).toContain('M-1 - Pump');
    expect(html).toContain('class="catalog-heading"');
    expect(html).toContain('class="catalog-file">photo.png</p>');
    expect(html).toContain('class="catalog-image" src="data:image/png;base64,');
    expect(html).not.toContain('<p>photo.png</p>');
  });

  it('sanitizes converted Word content before printing', async () => {
    const html = (svc as any).sanitizeDocxHtml(
      '<p>Specs</p><a href="javascript:alert(1)">Link</a><script>alert(2)</script><img src="data:image/png;base64,AAAA" onerror="alert(3)">',
    );
    expect(html).toContain('<p>Specs</p>');
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
});
