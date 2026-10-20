import { repairUploadedName } from './file-name';

const misread = (text: string) => Buffer.from(text, 'utf8').toString('latin1'); // what multer hands us

describe('repairUploadedName', () => {
  it('restores an Arabic name that was read as latin1', () => {
    expect(repairUploadedName(misread('كتالوج الكابلات.pdf'))).toBe('كتالوج الكابلات.pdf');
    expect(repairUploadedName(misread('Café catalogue.png'))).toBe('Café catalogue.png');
  });

  it('leaves correct names alone', () => {
    expect(repairUploadedName('كتالوج.pdf')).toBe('كتالوج.pdf');
    expect(repairUploadedName('catalog-2026.pdf')).toBe('catalog-2026.pdf');
    expect(repairUploadedName('')).toBe('');
  });

  it('does not invent text from a latin1 name that is not UTF-8', () => {
    expect(repairUploadedName('caf\u00e9.png')).toBe('caf\u00e9.png'); // a lone é is not a valid UTF-8 sequence
  });
});
