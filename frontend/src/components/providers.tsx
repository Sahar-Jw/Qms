'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/confirm';
import { GlobalLoader } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useBrandSettings } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useApplyTheme } from '@/lib/theme';
import { uploadUrl } from '@/lib/urls';

/**
 * Site-wide settings that must apply on EVERY page, including the landing and login pages a visitor sees before
 * signing in: the saved colours, and the site name / icon in the browser tab. Both endpoints are public.
 */
function SiteSync() {
  const { t } = useI18n();
  const brand = useBrandSettings();
  useApplyTheme();

  // Tab text: its own setting (Settings > Branding), else the site name, else the built-in app name.
  const tabTitle = brand.data?.tabTitle || brand.data?.websiteName || t('app.name');
  const icon = brand.data?.icon;

  useEffect(() => { document.title = tabTitle; }, [tabTitle]);

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
