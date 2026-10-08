import type { Metadata } from 'next';
import Script from 'next/script';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import arTexts from '@/lib/i18n/ar';
import enTexts from '@/lib/i18n/en';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-600.css';
import '@fontsource/cairo/latin-700.css';
import './globals.css';
import { Providers } from '@/components/providers';
import { I18nProvider, type Lang, type Overrides } from '@/lib/i18n';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

/** Edited UI texts, fetched on the server so the first paint already has them. Never blocks the page on failure. */
async function loadOverrides(): Promise<Overrides> {
  try {
    const res = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/translations`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    return res.ok ? ((await res.json()) as Overrides) : {};
  } catch {
    return {};
  }
}

/** Browser-tab title and description in the visitor's language (and as edited in Settings > Texts). */
export async function generateMetadata(): Promise<Metadata> {
  const lang: Lang = (await cookies()).get('lang')?.value === 'en' ? 'en' : 'ar';
  const all = await loadOverrides();
  const base = lang === 'ar' ? arTexts.app : enTexts.app;
  return { title: all['app.name']?.[lang] || base.name, description: all['app.tagline']?.[lang] || base.tagline };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const c = await cookies();
  const lang: Lang = c.get('lang')?.value === 'en' ? 'en' : 'ar';
  const overrides = await loadOverrides();
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body>
        <Script id="theme-bootstrap" strategy="beforeInteractive">{THEME_BOOT_SCRIPT}</Script>
        <I18nProvider initialLang={lang} initialOverrides={overrides}>
          <Providers>{children}</Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
