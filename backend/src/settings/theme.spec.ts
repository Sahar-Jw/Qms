import { normalizeBrand } from './theme';

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
