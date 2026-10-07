/** The five brand colours the whole interface is built from (Tailwind tokens ink / cocoa / clay / stone / sand). */
export const THEME_KEYS = ['ink', 'cocoa', 'clay', 'stone', 'sand'] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];
export type ThemeColors = Record<ThemeKey, string>;

/** Must match frontend/src/app/globals.css. Used when nothing has been saved. */
export const DEFAULT_THEME: ThemeColors = {
  ink: '#291C0E',
  cocoa: '#6E473B',
  clay: '#A78D78',
  stone: '#BEB5A9',
  sand: '#E1D4C2',
};

export const THEME_SETTING_KEY = 'theme';
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Saved value -> a complete, valid palette (any missing or malformed colour falls back to the default). */
export function normalizeTheme(raw: unknown): ThemeColors {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_THEME };
  for (const k of THEME_KEYS) {
    const v = src[k];
    if (typeof v === 'string' && HEX_COLOR.test(v)) out[k] = v.toUpperCase();
  }
  return out;
}
