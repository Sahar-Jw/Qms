'use client';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Building2, FilePlus2, Lock, Package, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QuotationTable } from '@/components/QuotationTable';
import { Button, Card, CardHeader, Loading, PILL_ORDER, PillStack } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe, useSettings } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { STATUSES, canSeeLocked, type Paginated, type QStatus, type QuotationListItem } from '@/lib/types';

export default function Dashboard() {
  const { t, pick, dir } = useI18n();
  const router = useRouter();
  const me = useMe().data!;
  const settings = useSettings().data;
  const company = settings?.issuingCompany;

  const visible = STATUSES.filter((s) => s !== 'locked' || canSeeLocked(me.role));
  const counts = useQueries({
    queries: visible.map((s) => ({
      queryKey: ['quotations', 'count', s],
      queryFn: () => api.get<Paginated<QuotationListItem>>('/quotations', { status: s, limit: 1 }),
    })),
  });
  const recent = useQuery({ queryKey: ['quotations', 'recent'], queryFn: () => api.get<Paginated<QuotationListItem>>('/quotations', { limit: 8 }) });

  const countOf = (s: QStatus) => counts[visible.indexOf(s)]?.data?.total ?? 0;
  const total = visible.reduce((a, s) => a + countOf(s), 0);
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const quick = [
    { href: '/customers', icon: Users, label: t('nav.customers') },
    { href: '/materials', icon: Package, label: t('nav.materials') },
    ...(canSeeLocked(me.role) ? [{ href: '/quotations?archived=true', icon: Lock, label: t('quotations.archived') }] : []),
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-cocoa to-clay p-6 text-sand shadow-lift lg:col-span-8 lg:p-8">
        <div className="max-w-xl">
          <h1 className="text-3xl font-bold leading-tight text-white">{t('dashboard.hello', { name: me.fullName.split(' ')[0] })}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-sand/90">
            <Building2 className="size-4" />
            {company ? <>{t('dashboard.issuingFrom')} <b className="text-white">{pick(company.nameAr, company.nameEn)}</b></> : <>{t('dashboard.noCompany')}</>}
            <Link href="/settings" className="underline decoration-sand/50 underline-offset-4 hover:text-white">{company ? t('quotations.changeInSettings') : t('dashboard.chooseCompany')}</Link>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/quotations/new"><Button variant="soft" size="lg"><FilePlus2 className="size-5" />{t('dashboard.newQuotation')}</Button></Link>
            <div className="rounded-full bg-ink/40 px-5 py-2.5 text-sm">
              {t('dashboard.totalQuotations')}: <b className="ms-1 text-lg tabular-nums text-white">{total}</b>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-16 end-[-4rem] hidden size-64 rounded-full bg-sand/10 md:block" />
        <div className="pointer-events-none absolute -top-10 end-24 hidden size-32 rounded-full bg-ink/25 md:block" />
      </section>

      {/* palette pills = statuses */}
      <Card className="p-5 lg:col-span-4 lg:row-span-2">
        <h2 className="mb-4 text-base font-bold">{t('dashboard.byStatus')}</h2>
        <PillStack items={PILL_ORDER.filter((s) => visible.includes(s)).map((s) => ({ key: s, label: t(`status.${s}`), value: countOf(s), onClick: () => router.push(`/quotations?status=${s}`) }))} />
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-bold">{t('dashboard.quick')}</h3>
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="flex items-center gap-3 rounded-full bg-sand/60 px-4 py-2.5 text-sm font-semibold hover:bg-sand">
              <q.icon className="size-4 text-cocoa" />{q.label}<Arrow className="ms-auto size-4 text-clay" />
            </Link>
          ))}
        </div>
      </Card>

      {/* latest */}
      <Card className="lg:col-span-8">
        <CardHeader title={t('dashboard.recent')} actions={<Link href="/quotations"><Button size="sm" variant="outline">{t('dashboard.seeAll')}</Button></Link>} />
        {recent.isLoading ? <Loading /> : recent.data?.data.length ? <QuotationTable rows={recent.data.data} compact /> : (
          <div className="flex flex-col items-center gap-3 py-10 text-sm text-cocoa">
            {t('dashboard.empty')}
            <Link href="/quotations/new"><Button>{t('dashboard.newQuotation')}</Button></Link>
          </div>
        )}
      </Card>
    </div>
  );
}
