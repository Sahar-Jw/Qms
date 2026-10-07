'use client';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Shell } from '@/components/Shell';
import { Button, Spinner } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useApplyTheme } from '@/lib/theme';

export default function AppLayout({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const { t } = useI18n();
  useApplyTheme(!!me.data); // site-wide colours, same for every user

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) router.replace('/login');
  }, [me.error, router]);

  if (!me.data) {
    const failed = me.error && !(me.error instanceof ApiError && me.error.status === 401);
    return (
      <div className="grid min-h-screen place-items-center">
        {failed ? (
          <div className="flex flex-col items-center gap-3 text-sm text-cocoa">
            {t('err.NETWORK')}
            <Button onClick={() => me.refetch()}>{t('common.next')}</Button>
          </div>
        ) : <Spinner className="size-8" />}
      </div>
    );
  }
  return <Shell user={me.data}>{children}</Shell>;
}
