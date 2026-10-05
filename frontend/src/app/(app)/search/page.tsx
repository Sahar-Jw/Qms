'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { QuotationTable } from '@/components/QuotationTable';
import { ActiveBadge, Card, CardHeader, Empty, Loading, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fmt } from '@/lib/money';
import type { Customer, Material, Paginated, QuotationListItem } from '@/lib/types';

interface Result { quotations: Paginated<QuotationListItem>; customers: Paginated<Customer>; materials: Paginated<Material> }

function Results() {
  const { t, pick } = useI18n();
  const q = (useSearchParams().get('q') ?? '').trim();
  const res = useQuery({ queryKey: ['search', q], enabled: !!q, queryFn: () => api.get<Result>('/search', { q, limit: 10 }) });

  if (!q) return <Card><Empty text={t('search.empty')} /></Card>;
  if (res.isLoading || !res.data) return <Loading />;
  const { quotations, customers, materials } = res.data;
  const count = (p: Paginated<unknown>) => <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-cocoa">{p.total}</span>;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-12">
        <CardHeader title={<>{t('search.quotations')} {count(quotations)}</>} />
        {quotations.data.length ? <QuotationTable rows={quotations.data} /> : <Empty text={t('search.nothing')} />}
      </Card>
      <Card className="lg:col-span-6">
        <CardHeader title={<>{t('search.customers')} {count(customers)}</>} />
        {customers.data.length ? (
          <ul className="divide-y divide-stone/40">
            {customers.data.map((c) => (
              <li key={c.id}><Link href="/customers" className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sand/60">
                <span className="min-w-0"><span className="block truncate font-bold">{pick(c.companyNameAr, c.companyNameEn)}</span><span className="block truncate text-xs text-cocoa">{[c.country, c.contactPersonName, c.phone].filter(Boolean).join(' / ')}</span></span>
                <ActiveBadge active={c.isActive} />
              </Link></li>
            ))}
          </ul>
        ) : <Empty text={t('search.nothing')} />}
      </Card>
      <Card className="lg:col-span-6">
        <CardHeader title={<>{t('search.materials')} {count(materials)}</>} />
        {materials.data.length ? (
          <ul className="divide-y divide-stone/40">
            {materials.data.map((m) => (
              <li key={m.id}><Link href="/materials" className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sand/60">
                <span className="min-w-0"><span className="block truncate font-bold"><span dir="ltr">{m.materialCode}</span> - {pick(m.nameAr, m.nameEn)}</span><span className="block text-xs text-cocoa" dir="ltr">{fmt(m.unitPrice)} {m.currency}</span></span>
                <ActiveBadge active={m.isActive} />
              </Link></li>
            ))}
          </ul>
        ) : <Empty text={t('search.nothing')} />}
      </Card>
    </div>
  );
}

export default function SearchPage() {
  const { t } = useI18n();
  const q = (useSearchParams().get('q') ?? '').trim();
  return (
    <>
      <PageHeader title={q ? t('search.title', { q }) : t('nav.search')} />
      <Suspense fallback={<Loading />}><Results /></Suspense>
    </>
  );
}
