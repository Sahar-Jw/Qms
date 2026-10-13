import { DEFAULT_THEME, normalizeBrand, normalizeTheme } from './theme';

describe('default theme', () => {
  it('matches the palette in the frontend stylesheet', () => {
    expect(DEFAULT_THEME).toEqual({
      ink: '#173158',
      cocoa: '#074D80',
      clay: '#3A82B6',
      stone: '#4A8DCB',
      sand: '#F6F6F6',
    });
    expect(normalizeTheme(null)).toEqual(DEFAULT_THEME);
  });
});

describe('normalizeBrand', () => {
  it('repairs asset paths saved with a duplicated kind prefix', () => {
    expect(normalizeBrand({
      logo: 'branding/logo-logo-123.png',
      icon: 'branding/icon-icon-456.webp',
    })).toMatchObject({
      logo: 'branding/logo-123.png',
      icon: 'branding/icon-456.webp',
    });
  });

  it('preserves correctly stored asset paths', () => {
    expect(normalizeBrand({
      logo: 'branding/logo-123.png',
      icon: 'branding/icon-456.webp',
    })).toMatchObject({
      logo: 'branding/logo-123.png',
      icon: 'branding/icon-456.webp',
    });
  });
});
