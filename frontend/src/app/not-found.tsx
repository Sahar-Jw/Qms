'use client';

import { ArrowRight, FileQuestion, House } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-stone/60 bg-white/90 p-7 text-center shadow-lift sm:p-10">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-sand text-cocoa ring-1 ring-stone/60">
          <FileQuestion aria-hidden="true" className="size-8" />
        </div>
        <p className="mt-6 text-sm font-bold tracking-[0.2em] text-clay" dir="ltr">404</p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t('notFound.title')}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-cocoa sm:text-base">
          {t('notFound.description')}
        </p>
        <div className="mt-7 flex justify-center">
          <Button onClick={() => router.push('/')}>
            <House aria-hidden="true" className="size-4" />
            {t('notFound.home')}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </main>
  );
}
