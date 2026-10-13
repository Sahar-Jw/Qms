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
import { apiUrl } from '@/lib/urls';

/**
 * Static export: this file runs ONCE at build time, so it can no longer read the visitor's cookie or call the API.
 * A single default brand name is baked in; LANG_BOOT_SCRIPT switches lang/dir from the `lang` cookie before first paint,
 * and I18nProvider loads edited texts from the API in the browser.
 */
export const metadata: Metadata = {
  title: 'Quotations',
  applicationName: 'Quotations',
  description: arTexts.app.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* The saved colours, straight from the server. A stylesheet in <head> is loaded together with the site's own CSS
            (no extra wait) and before anything is painted, so the page never shows other colours. Nothing is cached. */}
        <link rel="stylesheet" href={apiUrl('/settings/theme.css')} />
      </head>
      <body>
        <Script id="lang-bootstrap" strategy="beforeInteractive">{LANG_BOOT_SCRIPT}</Script>
        <I18nProvider>
          <Providers>{children}</Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
