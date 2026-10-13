'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/confirm';
import { GlobalLoader } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useBrandCache, useSiteBrand } from '@/lib/brand';
import { useI18n } from '@/lib/i18n';
import { useApplyTheme } from '@/lib/theme';
import { uploadUrl } from '@/lib/urls';

/**
 * Site-wide settings that must apply on EVERY page, including the landing and login pages a visitor sees before
 * signing in: the saved colours, and the site name / icon in the browser tab. Both endpoints are public.
 */
function SiteSync() {
  const { brand, name: siteName, tabTitle } = useSiteBrand();
  useBrandCache();
  useApplyTheme();

  // Tab text: its own setting (Settings > Branding), else the site name. Identical in every language.
  const icon = brand?.icon;

  useEffect(() => {
    if (!tabTitle) return;
    document.title = tabTitle;
    // Next re-applies the page's built-in (Arabic) title on navigation: put the saved one back whenever that happens.
    const mo = new MutationObserver(() => { if (document.title !== tabTitle) document.title = tabTitle; });
    mo.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [tabTitle]);

  useEffect(() => {
    if (!siteName) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="application-name"]');
    if (meta) meta.content = siteName;
  }, [siteName]);

  useEffect(() => {
    const href = icon ? uploadUrl(icon) : '';
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link && href) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (link) {
      if (href) link.href = href;
      else link.remove();
    }
  }, [icon]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const { dir } = useI18n();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SiteSync />
      <ConfirmProvider>{children}</ConfirmProvider>
      <GlobalLoader />
      <Toaster position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'} dir={dir} richColors={false} toastOptions={{ classNames: { toast: '!bg-ink !text-sand !border-cocoa !rounded-2xl !font-sans' } }} />
    </QueryClientProvider>
  );
}
