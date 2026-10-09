import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import arTexts from '@/lib/i18n/ar';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-600.css';
import '@fontsource/cairo/latin-700.css';
import './globals.css';
import { Providers } from '@/components/providers';
import { I18nProvider, LANG_BOOT_SCRIPT } from '@/lib/i18n';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

/**
 * Static export: this file runs ONCE at build time, so it can no longer read the visitor's cookie or call the API.
 * The default (Arabic) is baked in; LANG_BOOT_SCRIPT switches lang/dir from the `lang` cookie before first paint, and
 * I18nProvider loads edited texts from the API in the browser (and updates the tab title).
 */
export const metadata: Metadata = { title: arTexts.app.name, description: arTexts.app.tagline };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <Script id="lang-bootstrap" strategy="beforeInteractive">{LANG_BOOT_SCRIPT}</Script>
        <Script id="theme-bootstrap" strategy="beforeInteractive">{THEME_BOOT_SCRIPT}</Script>
        <I18nProvider>
          <Providers>{children}</Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
