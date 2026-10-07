'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from './api';

/** The five brand colours the whole interface is built from (the Tailwind tokens in globals.css). */
export const THEME_KEYS = ['ink', 'cocoa', 'clay', 'stone', 'sand'] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];
export type ThemeColors = Record<ThemeKey, string>;

/** Same values as globals.css and the backend. */
export const DEFAULT_THEME: ThemeColors = {
  ink: '#291C0E',
  cocoa: '#6E473B',
  clay: '#A78D78',
  stone: '#BEB5A9',
  sand: '#E1D4C2',
};

export const THEME_STORAGE_KEY = 'qms-theme';
export const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: string) => HEX.test(v);

/** Lets the five tokens be overridden on any element (the page root, or the settings preview card). */
export const themeVars = (c: ThemeColors): Record<string, string> =>
  Object.fromEntries(THEME_KEYS.map((k) => [`--color-${k}`, c[k]]));

export function applyTheme(c: ThemeColors) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(themeVars(c))) root.style.setProperty(name, value);
  try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(c)); } catch { /* storage blocked: the colours still apply for this visit */ }
}

/** The saved site-wide theme. Any signed-in user can read it; managers and above can change it. */
export const useTheme = (enabled = true) =>
  useQuery({ queryKey: ['theme'], enabled, staleTime: 5 * 60_000, queryFn: () => api.get<{ colors: ThemeColors }>('/settings/theme') });

/** Paints the whole app in the saved colours (call once, in the signed-in layout). */
export function useApplyTheme(enabled: boolean) {
  const { data } = useTheme(enabled);
  useEffect(() => { if (data) applyTheme(data.colors); }, [data]);
}

/**
 * Runs in <head> before the first paint, so a returning visitor never sees the default colours flash.
 * Static text (no user input): it only reads the palette cached by applyTheme().
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||'null');if(!t)return;var k=${JSON.stringify(THEME_KEYS)},r=document.documentElement.style;for(var i=0;i<k.length;i++){var v=t[k[i]];if(typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v))r.setProperty('--color-'+k[i],v)}}catch(e){}})();`;

/* ------------------------------------------------------------------ contrast (WCAG) */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The pairs the interface depends on being readable: dark text on the light background (and light text on the
 * dark sidebar, same pair) and white button text on the primary colour.
 */
export function readability(c: ThemeColors) {
  const pairs = { text: contrast(c.ink, c.sand), button: contrast('#FFFFFF', c.cocoa) };
  const min = Math.min(pairs.text, pairs.button);
  return { ...pairs, level: min < 3 ? ('unreadable' as const) : min < 4.5 ? ('weak' as const) : ('good' as const) };
}
