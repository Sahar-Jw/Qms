'use client';
import { useQuery } from '@tanstack/react-query';
import { FilePlus2, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { QuotationTable } from '@/components/QuotationTable';
import { Button, Card, Input, Loading, PageHeader, Pagination, STATUS_STYLE } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { useMe } from '@/lib/auth';
import { STATUSES, canSeeLocked, type Paginated, type QStatus, type QuotationListItem } from '@/lib/types';

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const h = setTimeout(() => setD(v), ms); return () => clearTimeout(h); }, [v, ms]);
  return d;
}

function List() {
  const { t } = useI18n();
  const me = useMe().data!;
  const seesLocked = canSeeLocked(me.role);
  const sp = useSearchParams();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<QStatus | ''>(() => {
    const v = sp.get('status') as QStatus | null;
    return v && STATUSES.includes(v) && (v !== 'locked' || seesLocked) ? v : '';
  });
  const [archived, setArchived] = useState<'' | 'true' | 'false'>(sp.get('archived') === 'true' && seesLocked ? 'true' : '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, status, archived, from, to]);

  const params = { q: dq, status, archived, from, to, page, limit: 15 };
  const list = useQuery({ queryKey: ['quotations', 'list', params], queryFn: () => api.get<Paginated<QuotationListItem>>('/quotations', params), placeholderData: (p) => p });
  const dirty = q || status || archived || from || to;

  return (
    <>
      <PageHeader title={t('quotations.title')} sub={list.data ? `${list.data.total} ${t('common.results')}` : undefined}
        actions={<Link href="/quotations/new"><Button><FilePlus2 className="size-4" />{t('dashboard.newQuotation')}</Button></Link>} />

      <Card className="mb-4 space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-clay" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('quotations.searchPh')} className="ps-10" />
          </div>
          <div className="flex items-center gap-2"><span className="text-xs font-semibold text-cocoa">{t('common.from')}</span><Input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" /></div>
          <div className="flex items-center gap-2"><span className="text-xs font-semibold text-cocoa">{t('common.to')}</span><Input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" /></div>
          {dirty ? <Button variant="ghost" onClick={() => { setQ(''); setStatus(''); setArchived(''); setFrom(''); setTo(''); }}>{t('common.clear')}</Button> : <span />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setStatus('')} className={cn('rounded-full px-4 py-1.5 text-xs font-bold ring-1 ring-inset ring-stone', !status ? 'bg-ink text-sand ring-ink' : 'bg-white text-cocoa hover:bg-sand')}>{t('quotations.allStates')}</button>
          {STATUSES.filter((s) => s !== 'locked' || seesLocked).map((s) => (
            <button key={s} onClick={() => setStatus(s === status ? '' : s)} className={cn('rounded-full px-4 py-1.5 text-xs font-bold transition-shadow', STATUS_STYLE[s].pill, status === s ? 'ring-2 ring-ink ring-offset-2 ring-offset-white' : 'opacity-80 hover:opacity-100')}>
              {t(`status.${s}`)}
            </button>
          ))}
          {seesLocked && <span className="mx-1 h-5 w-px bg-stone" />}
          {seesLocked && ([['', 'quotations.allStates'], ['false', 'quotations.active'], ['true', 'quotations.archived']] as const).map(([v, k]) => (
            <button key={v} onClick={() => setArchived(v)} className={cn('rounded-full px-4 py-1.5 text-xs font-bold ring-1 ring-inset ring-stone', archived === v ? 'bg-cocoa text-white ring-cocoa' : 'bg-white text-cocoa hover:bg-sand')}>{t(k)}</button>
          ))}
        </div>
      </Card>

      <Card>
        {list.isLoading ? <Loading /> : <QuotationTable rows={list.data?.data ?? []} />}
        {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} />}
      </Card>
    </>
  );
}

export default function QuotationsPage() {
  return <Suspense fallback={<Loading />}><List /></Suspense>;
}
