import { PdfService } from './pdf.service';

describe('printed quotation: company header and footer', () => {
  const svc = new PdfService({ get: () => undefined } as any, { map: async () => ({}) } as any);

  const quotation = (company: Record<string, unknown> = {}) =>
    ({
      id: 1, quotationNumber: 'Q-1', quotationDate: '2026-10-11', status: 'draft',
      company: { id: 1, name: 'Acme', logo: null, address: 'Damascus', phone: '1', email: 'a@b.c', website: null, header: null, footer: null, ...company },
      customer: { id: 1, companyName: 'Client', managerName: null, phone: [], email: null, country: null },
      responsibleUser: null, customerPaymentMethod: null, bankName: null, validity: null, deliveryTime: null,
      paymentMethod: null, paymentLocation: null, deliveryMethod: null, notes: null, items: [], totals: [],
    }) as any;

  const co = { header: 'Acme Letterhead\nالسطر الثاني', footer: 'Acme Footer <b>x</b>' };

  it.each(['ar', 'en'] as const)('prints the same header and footer on the %s file', async (lang) => {
    const html = await svc.renderHtml(quotation(co), { lang, includeCost: false });
    expect(html).toContain('<div class="cohead"><bdi dir="auto">Acme Letterhead<br>السطر الثاني</bdi></div>');
    expect(html).toContain('<div class="cofoot"><bdi dir="auto">Acme Footer &lt;b&gt;x&lt;/b&gt;</bdi></div>');
  });

  it('the two languages differ only in the quotation words, not in the header / footer blocks', async () => {
    const block = (html: string, cls: string) => html.match(new RegExp(`<div class="${cls}">[\\s\\S]*?</div>`))![0];
    const ar = await svc.renderHtml(quotation(co), { lang: 'ar', includeCost: false });
    const en = await svc.renderHtml(quotation(co), { lang: 'en', includeCost: false });
    expect(block(ar, 'cohead')).toBe(block(en, 'cohead'));
    expect(block(ar, 'cofoot')).toBe(block(en, 'cofoot'));
    expect(ar).toContain('عرض سعر');
    expect(en).toContain('Quotation');
  });

  it('escapes whatever was typed (no HTML injection into the print page)', async () => {
    const html = await svc.renderHtml(quotation(co), { lang: 'en', includeCost: false });
    expect(html).not.toContain('<b>x</b>');
  });

  it('header sits above the title and footer after the totals', async () => {
    const html = await svc.renderHtml(quotation(co), { lang: 'en', includeCost: false });
    expect(html.indexOf('class="cohead"')).toBeLessThan(html.indexOf('class="title"'));
    expect(html.indexOf('class="cofoot"')).toBeGreaterThan(html.indexOf('class="totals"'));
  });

  it('prints nothing extra when the company has no header / footer', async () => {
    for (const lang of ['ar', 'en'] as const) {
      const html = await svc.renderHtml(quotation(), { lang, includeCost: false });
      expect(html).not.toContain('class="cohead"');
      expect(html).not.toContain('class="cofoot"');
    }
    const blank = await svc.renderHtml(quotation({ header: '   ', footer: '\n' }), { lang: 'en', includeCost: false });
    expect(blank).not.toContain('class="cohead"');
    expect(blank).not.toContain('class="cofoot"');
  });
});
