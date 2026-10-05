'use client';
import { useI18n } from '@/lib/i18n';
import { fmt, isZero } from '@/lib/money';
import type { Amounts } from '@/lib/types';

/** Per-currency totals (currencies are never mixed). Dark "ledger" block - used in the form and the detail page. */
export function Ledger({ totals, showCost }: { totals: Amounts[]; showCost?: boolean }) {
  const { t } = useI18n();
  if (!totals.length) return <p className="text-sm text-sand/80">{t('quotations.noItems')}</p>;
  return (
    <div className="space-y-3">
      {totals.map((a) => (
        <div key={a.currency} className="rounded-2xl bg-ink/50 p-4" dir="ltr">
          <div className="flex items-baseline justify-between gap-3">
            <span className="rounded-full bg-sand px-3 py-0.5 text-xs font-bold text-ink">{a.currency}</span>
            <span className="text-2xl font-bold tabular-nums text-white">{fmt(a.required)}</span>
          </div>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-xs text-sand/85" dir={undefined}>
            <dt>{t('quotations.value')}</dt><dd className="text-end tabular-nums">{fmt(a.value)}</dd>
            {!isZero(a.shipping) && (<><dt>{t('quotations.shipping')}</dt><dd className="text-end tabular-nums">{fmt(a.shipping)}</dd></>)}
            {!isZero(a.customs) && (<><dt>{t('quotations.customs')}</dt><dd className="text-end tabular-nums">{fmt(a.customs)}</dd></>)}
            {showCost && !isZero(a.cost) && (<><dt>{t('quotations.totalCost')}</dt><dd className="text-end tabular-nums text-clay">{fmt(a.cost)}</dd></>)}
          </dl>
        </div>
      ))}
    </div>
  );
}
