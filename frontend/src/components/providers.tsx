'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

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
      {children}
      <Toaster position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'} dir={dir} richColors={false} toastOptions={{ classNames: { toast: '!bg-ink !text-sand !border-cocoa !rounded-2xl !font-sans' } }} />
    </QueryClientProvider>
  );
}
