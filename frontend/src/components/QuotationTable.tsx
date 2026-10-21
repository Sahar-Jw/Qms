'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Empty, StatusBadge, td, th, tr } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { fmt } from '@/lib/money';
import { quotationHref } from '@/lib/urls';
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
              onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button')) router.push(quotationHref(q.id)); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) router.push(quotationHref(q.id)); }}>
              <td className={td}><Link href={quotationHref(q.id)} className="whitespace-nowrap font-bold text-cocoa underline decoration-clay/60 underline-offset-4 hover:text-ink"><bdi dir="ltr">{q.quotationNumber}</bdi></Link></td>
              <td className={`${td} max-w-56 truncate`}>{q.customer.companyName ?? ''}</td>
              {!compact && <td className={`${td} max-w-44 truncate`}>{q.company.name}</td>}
              {!compact && <td className={td}>{q.responsibleUser?.fullName ?? '—'}</td>}
              <td className={`${td} tabular-nums`}><bdi dir="ltr">{q.quotationDate}</bdi></td>
              <td className={`${td} tabular-nums`}>
                {q.totals.length ? q.totals.map((x) => <div key={x.currency} className="whitespace-nowrap font-semibold"><bdi dir="ltr">{fmt(x.required)} <span className="text-xs text-cocoa">{x.currency}</span></bdi></div>) : '—'}
              </td>
              <td className={td}><StatusBadge status={q.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
