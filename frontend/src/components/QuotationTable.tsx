'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Empty, StatusBadge, td, th, tr } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { fmt } from '@/lib/money';
import type { QuotationListItem } from '@/lib/types';

/** Shared by the dashboard, the list and the search page. */
export function QuotationTable({ rows, compact }: { rows: QuotationListItem[]; compact?: boolean }) {
  const { t, pick } = useI18n();
  const router = useRouter();
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr>
            <th className={th}>{t('quotations.number')}</th>
            <th className={th}>{t('quotations.customer')}</th>
            {!compact && <th className={th}>{t('quotations.company')}</th>}
            {!compact && <th className={th}>{t('quotations.responsible')}</th>}
            <th className={th}>{t('quotations.date')}</th>
            <th className={th}>{t('quotations.totals')}</th>
            <th className={th}>{t('common.status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr key={q.id} className={`${tr} cursor-pointer`} tabIndex={0}
              onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button')) router.push(`/quotations/${q.id}`); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) router.push(`/quotations/${q.id}`); }}>
              <td className={td}><Link href={`/quotations/${q.id}`} className="font-bold text-cocoa underline decoration-clay/60 underline-offset-4 hover:text-ink" dir="ltr">{q.quotationNumber}</Link></td>
              <td className={`${td} max-w-56 truncate`}>{pick(q.customer.companyNameAr, q.customer.companyNameEn)}</td>
              {!compact && <td className={`${td} max-w-44 truncate`}>{pick(q.company.nameAr, q.company.nameEn)}</td>}
              {!compact && <td className={td}>{q.responsibleUser?.fullName ?? '—'}</td>}
              <td className={`${td} tabular-nums`} dir="ltr">{q.quotationDate}</td>
              <td className={`${td} tabular-nums`} dir="ltr">
                {q.totals.length ? q.totals.map((x) => <div key={x.currency} className="whitespace-nowrap font-semibold">{fmt(x.required)} <span className="text-xs text-cocoa">{x.currency}</span></div>) : '—'}
              </td>
              <td className={td}><StatusBadge status={q.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
