import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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
    fs.writeFileSync(path.join(dir, 'letterheads', 'head.png'), PNG);
    fs.writeFileSync(path.join(dir, 'letterheads', 'foot.png'), PNG);
    process.env.UPLOADS_DIR = dir;
  });
  afterAll(() => {
    if (prevDir === undefined) delete process.env.UPLOADS_DIR; else process.env.UPLOADS_DIR = prevDir;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const quotation = (company: Record<string, unknown> = {}) =>
    ({
      id: 1, quotationNumber: 'Q-1', quotationDate: '2026-10-11', status: 'draft',
      company: { id: 1, name: 'Acme', logo: null, address: 'Damascus', phone: '1', email: 'a@b.c', website: null, headerImage: null, footerImage: null, ...company },
      customer: { id: 1, companyName: 'Client', managerName: null, phone: [], email: null, country: null },
      responsibleUser: null, customerPaymentMethod: null, bankName: null, validity: null, deliveryTime: null,
      paymentMethod: null, paymentLocation: null, deliveryMethod: null, notes: null, items: [], totals: [],
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

  it('a header image replaces the text letterhead (logo / name / address); without one the text letterhead stays', async () => {
    const withHead = await svc.renderHtml(quotation(withImages), { lang: 'en', includeCost: false });
    expect(withHead).not.toContain('<div class="head">');
    const without = await svc.renderHtml(quotation(), { lang: 'en', includeCost: false });
    expect(without).toContain('<div class="head">');
    expect(without).toContain('Damascus');
    expect(tag(without, 'cohead')).toBeUndefined();
    expect(tag(without, 'cofoot')).toBeUndefined();
  });

  it('a missing image file is skipped instead of breaking the print', async () => {
    const html = await svc.renderHtml(quotation({ headerImage: 'letterheads/gone.png', footerImage: 'letterheads/gone2.png' }), { lang: 'en', includeCost: false });
    expect(tag(html, 'cohead')).toBeUndefined();
    expect(tag(html, 'cofoot')).toBeUndefined();
    expect(html).toContain('<div class="head">');
  });
});
