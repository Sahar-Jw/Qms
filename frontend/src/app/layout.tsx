import type { Metadata } from 'next';
import Script from 'next/script';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-600.css';
import '@fontsource/cairo/latin-700.css';
import './globals.css';
import { Providers } from '@/components/providers';
import { I18nProvider, type Lang } from '@/lib/i18n';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';

export const metadata: Metadata = { title: 'عروض الأسعار · Quotations', description: 'Quotation management system' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const c = await cookies();
  const lang: Lang = c.get('lang')?.value === 'en' ? 'en' : 'ar';
  return (
    <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body>
        <Script id="theme-bootstrap" strategy="beforeInteractive">{THEME_BOOT_SCRIPT}</Script>
        <I18nProvider initialLang={lang}>
          <Providers>{children}</Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
