'use client';
import { Coins, Languages, Printer, Receipt } from 'lucide-react';
import type { ReactNode } from 'react';
import { LangToggle } from '@/components/Shell';
import { PILL_ORDER, PillStack } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-b from-sand via-clay to-cocoa p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-ink text-sand"><Receipt className="size-6" /></span>
          <span className="text-2xl font-bold text-ink">{t('app.name')}</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-4xl font-bold leading-snug text-ink">{t('auth.heroTitle')}</h2>
          <p className="mt-3 text-base leading-relaxed text-ink/80">{t('auth.heroSub')}</p>
        </div>
        <div className="max-w-sm">
          <PillStack items={PILL_ORDER.map((s) => ({ key: s, label: t(`status.${s}`) }))} />
        </div>
      </div>
      <div className="relative flex items-center justify-center p-5 sm:p-10">
        <LangToggle className="absolute end-5 top-5" />
        <div className="w-full max-w-md">
          {children}
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {[[Languages, 'auth.feat1'], [Coins, 'auth.feat2'], [Printer, 'auth.feat3']].map(([Icon, k]) => {
              const I = Icon as typeof Languages;
              return <li key={k as string} className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold text-cocoa ring-1 ring-stone/60"><I className="size-4" />{t(k as string)}</li>;
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
