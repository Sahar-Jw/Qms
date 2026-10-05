'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import ar from './ar';
import en from './en';

export type Lang = 'ar' | 'en';
const dicts = { ar, en } as const;

function lookup(obj: unknown, path: string): string | undefined {
  let cur: any = obj;
  for (const k of path.split('.')) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return typeof cur === 'string' ? cur : undefined;
}

interface Ctx {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  t: (key: string, vars?: Record<string, string | number>) => string;
  has: (key: string) => boolean;
  setLang: (l: Lang) => void;
  /** Pick the Arabic or foreign-language text according to the UI language, with fallback to the other one. */
  pick: (arText: string | null | undefined, enText: string | null | undefined) => string;
}

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    setLangState(l);
  }, []);

  const value = useMemo<Ctx>(() => {
    const d = dicts[lang];
    return {
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      setLang,
      has: (key) => lookup(d, key) !== undefined,
      t: (key, vars) => {
        let s = lookup(d, key) ?? lookup(dicts.en, key) ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
        return s;
      },
      pick: (a, e) => (lang === 'ar' ? a || e || '' : e || a || ''),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error('useI18n must be used inside I18nProvider');
  return c;
}
