import { PdfService } from './pdf.service';

describe('printed quotation words', () => {
  const make = (edited: Record<string, { ar?: string; en?: string }> | Error) =>
    new PdfService({ get: () => undefined } as any, { map: async () => { if (edited instanceof Error) throw edited; return edited; } } as any);
  const labels = (s: PdfService, lang: 'ar' | 'en') => (s as any).labels(lang) as Promise<Record<string, string>>;

  it('uses the built-in words when nothing was edited', async () => {
    const l = await labels(make({}), 'en');
    expect(l.title).toBe('Quotation');
    expect((await labels(make({}), 'ar')).title).toBe('عرض سعر');
  });

  it('uses the edited word, per language, and keeps the rest', async () => {
    const s = make({ 'pdf.title': { ar: 'عرض أسعار', en: 'Price offer' }, 'pdf.bank': { en: 'Bank account' } });
    const en = await labels(s, 'en');
    expect(en.title).toBe('Price offer');
    expect(en.bank).toBe('Bank account');
    expect(en.date).toBe('Date');
    const ar = await labels(s, 'ar');
    expect(ar.title).toBe('عرض أسعار');
    expect(ar.bank).toBe('المصرف'); // only English was edited
  });

  it('falls back to the built-in words if the edited texts cannot be loaded', async () => {
    expect((await labels(make(new Error('db down')), 'en')).title).toBe('Quotation');
  });
});
