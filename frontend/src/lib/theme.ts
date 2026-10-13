'use client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from './api';
import { apiUrl } from './urls';

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

/** The saved site-wide theme. Public (visitors need it on the landing page); managers and above can change it. */
export const useTheme = (enabled = true) =>
  useQuery({
    queryKey: ['theme'],
    enabled,
    // Always ask the server: another manager may have changed the colours since this tab last looked.
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: () => api.get<{ colors: ThemeColors }>('/settings/theme'),
  });

/** Paints the whole site in the saved colours. Mounted once for every page (see providers.tsx), signed in or not. */
export function useApplyTheme(enabled = true) {
  const { data } = useTheme(enabled);
  useEffect(() => {
    if (!data) return;
    applyTheme(data.colors);
    document.documentElement.removeAttribute(THEME_PENDING_ATTR);
  }, [data]);
}

/** While this attribute is on <html>, the page stays hidden (see globals.css): nothing is painted in the wrong colours. */
export const THEME_PENDING_ATTR = 'data-theme-pending';
/** How long the first paint may wait for the server's palette before falling back to the last one seen on this device. */
const THEME_WAIT_MS = 3000;

/**
 * Runs in <head> before the first paint. The page is held back until the SAVED palette has arrived from the server,
 * so neither the built-in colours nor an out-of-date copy cached on this device ever flash on screen.
 * The cached copy is only a fallback if the server cannot be reached within a few seconds.
 * Static text (no user input).
 */
export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement,K=${JSON.stringify(THEME_KEYS)},S=${JSON.stringify(THEME_STORAGE_KEY)},P=${JSON.stringify(THEME_PENDING_ATTR)},done=false;
function paint(t){for(var i=0;i<K.length;i++){var v=t&&t[K[i]];if(typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v))d.style.setProperty('--color-'+K[i],v)}}
function finish(){if(done)return;done=true;d.removeAttribute(P)}
d.setAttribute(P,'1');
try{paint(JSON.parse(localStorage.getItem(S)||'null'))}catch(e){}
var timer=setTimeout(finish,${THEME_WAIT_MS});
try{fetch(${JSON.stringify(apiUrl('/settings/theme'))},{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.colors){paint(j.colors);try{localStorage.setItem(S,JSON.stringify(j.colors))}catch(e){}}}).catch(function(){}).then(function(){clearTimeout(timer);finish()})}catch(e){clearTimeout(timer);finish()}
})();`;

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
