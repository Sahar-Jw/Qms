'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Copy, Eye, FileDown, Lock, Pencil, Printer, Receipt, Undo2, Unlock } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Ledger } from '@/components/Totals';
import { Button, Card, CardHeader, Empty, Loading, StatusBadge, td, th, tr } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { toastError } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { fmt, isZero } from '@/lib/money';
import { hasRole, type Amounts, type QStatus, type QuotationView } from '@/lib/types';

function Money({ amounts, field }: { amounts: Amounts[]; field: 'value' | 'shipping' | 'customs' | 'required' | 'cost' }) {
  const rows = amounts.filter((a) => !isZero(a[field]));
  if (!rows.length) return <span className="text-clay">—</span>;
  return <>{rows.map((a) => <div key={a.currency} className="whitespace-nowrap tabular-nums" dir="ltr">{fmt(a[field])} <span className="text-xs text-cocoa">{a.currency}</span></div>)}</>;
}

function Info({ label, value }: { label: string; value?: ReactNode }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-cocoa">{label}</dt>
      <dd className="break-words text-sm font-semibold"><bdi>{value}</bdi></dd>
    </div>
  );
}

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, has, pick } = useI18n();
  const me = useMe().data!;
  const qc = useQueryClient();
  const router = useRouter();
  const [cost, setCost] = useState(false);
  const canCost = hasRole(me.role, 'manager');

  const query = useQuery({ queryKey: ['quotation', Number(id)], queryFn: () => api.get<QuotationView>(`/quotations/${id}`) });
  const q = query.data;

  const changeStatus = useMutation({
    mutationFn: (status: QStatus) => api.post<QuotationView>(`/quotations/${id}/status`, { status }),
    onSuccess: (data) => { qc.setQueryData(['quotation', Number(id)], data); qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success(t('statusAction.done', { status: t(`status.${data.status}`) })); },
    onError: (e) => toastError(e, t, has),
  });
  const duplicate = useMutation({
    mutationFn: () => api.post<QuotationView>(`/quotations/${id}/duplicate`, {}),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['quotations'] }); toast.success(t('quotations.duplicated', { number: data.quotationNumber })); router.push(`/quotations/${data.id}`); },
    onError: (e) => toastError(e, t, has),
  });

  if (query.isLoading) return <Loading />;
  if (!q) return <Card><Empty text={t('err.QUOTATION_NOT_FOUND')} /></Card>;

  const printUrl = (lang: 'ar' | 'en') => `/api/quotations/${q.id}/print?lang=${lang}&autoprint=true${cost ? '&includeCost=true' : ''}`;
  async function downloadPdf(lang: 'ar' | 'en') {
    try {
      const res = await fetch(`/api/quotations/${q!.id}/pdf?lang=${lang}${cost ? '&includeCost=true' : ''}`, { credentials: 'same-origin' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw Object.assign(new Error(d.message ?? res.statusText), { code: d.code });
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `${q!.quotationNumber}-${lang}.pdf`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      const code = (e as { code?: string }).code;
      toast.error(code && has(`err.${code}`) ? t(`err.${code}`) : (e as Error).message);
    }
  }

  const statusIcon = (to: QStatus) => {
    if (q.status === 'locked') return <Unlock className="size-4" />;
    if (to === 'locked') return <Lock className="size-4" />;
    if (to === 'issued') return <CheckCircle2 className="size-4" />;
    if (to === 'expired') return <Clock className="size-4" />;
    if (to === 'invoiced') return <Receipt className="size-4" />;
    return <Undo2 className="size-4 rtl:-scale-x-100" />;
  };
  const statusLabel = (to: QStatus) => (q.status === 'locked' && to === 'issued' ? t('statusAction.unlock') : t(`statusAction.${to}`));
  const co = q.company;

  return (
    <div className="space-y-4">
      {/* banner */}
      <section className="rounded-3xl bg-gradient-to-br from-ink via-cocoa to-clay p-6 text-sand shadow-lift">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {co.logo
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={`/uploads/${co.logo}`} alt="" className="size-16 rounded-2xl bg-white object-contain p-1" />
              : <span className="grid size-16 place-items-center rounded-2xl bg-sand text-2xl font-bold text-ink">{pick(co.nameAr, co.nameEn).charAt(0)}</span>}
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-white" dir="ltr">{q.quotationNumber}</h1>
                <StatusBadge status={q.status} />
              </div>
              <p className="mt-1 text-sm text-sand/90">{pick(co.nameAr, co.nameEn)} · <span dir="ltr" className="tabular-nums">{q.quotationDate}</span></p>
              <p className="text-base font-bold text-white">{pick(q.customer.companyNameAr, q.customer.companyNameEn)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {q.readOnlyReason === 'not_owner' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/40 px-3.5 py-2 text-xs font-semibold" title={t('quotations.notOwner')}><Eye className="size-4" />{t('quotations.mineOnly')}</span>
            )}
            {q.editable && <Link href={`/quotations/${q.id}/edit`}><Button variant="soft"><Pencil className="size-4" />{t('common.edit')}</Button></Link>}
            <Button variant="dark" loading={duplicate.isPending} onClick={() => confirm(t('quotations.duplicateConfirm')) && duplicate.mutate()}><Copy className="size-4" />{t('common.duplicate')}</Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-sand/20 pt-4">
          {q.allowedStatuses.map((to) => (
            <Button key={to} size="sm" variant="soft" loading={changeStatus.isPending && changeStatus.variables === to}
              onClick={() => confirm(t('statusAction.confirm', { status: t(`status.${to}`) })) && changeStatus.mutate(to)}>
              {statusIcon(to)}{statusLabel(to)}
            </Button>
          ))}
          <span className="ms-auto" />
          {canCost && (
            <label className="flex cursor-pointer items-center gap-2 rounded-full bg-ink/40 px-3.5 py-1.5 text-xs font-semibold">
              <input type="checkbox" checked={cost} onChange={(e) => setCost(e.target.checked)} className="size-4 accent-sand" />{t('quotations.includeCost')}
            </label>
          )}
          {(['ar', 'en'] as const).map((l) => (
            <span key={l} className="inline-flex overflow-hidden rounded-full ring-1 ring-sand/40">
              <button onClick={() => window.open(printUrl(l), '_blank')} className="flex items-center gap-1.5 bg-ink/40 px-3.5 py-1.5 text-xs font-bold hover:bg-ink"><Printer className="size-3.5" />{t(l === 'ar' ? 'quotations.printAr' : 'quotations.printEn')}</button>
              <button onClick={() => downloadPdf(l)} className="flex items-center gap-1.5 border-s border-sand/30 bg-ink/40 px-3 py-1.5 text-xs font-bold hover:bg-ink" title={t(l === 'ar' ? 'quotations.pdfAr' : 'quotations.pdfEn')}><FileDown className="size-3.5" />PDF</button>
            </span>
          ))}
        </div>
      </section>

      <Card>
            <CardHeader title={<>{t('quotations.items')} <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-cocoa">{q.items.length}</span></>} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead><tr>
                  <th className={th}>#</th><th className={th}>{t('common.code')}</th><th className={th}>{t('quotations.material')}</th><th className={th}>{t('quotations.quantity')}</th>
                  <th className={th}>{t('quotations.unitPrice')}</th><th className={th}>{t('quotations.value')}</th><th className={th}>{t('quotations.shipping')}</th>
                  <th className={th}>{t('quotations.customs')}</th><th className={th}>{t('quotations.required')}</th>{canCost && <th className={th}>{t('quotations.totalCost')}</th>}
                </tr></thead>
                <tbody>
                  {q.items.map((i, n) => (
                    <tr key={i.id} className={tr}>
                      <td className={td}>{n + 1}</td>
                      <td className={`${td} font-semibold`} dir="ltr">{i.materialCode}</td>
                      <td className={td}>{pick(i.materialNameAr, i.materialNameEn)}{i.notes && <div className="text-xs text-clay">{i.notes}</div>}</td>
                      <td className={`${td} whitespace-nowrap tabular-nums`} dir="ltr">{fmt(i.quantity)} <span className="text-xs text-cocoa">{i.unit}</span></td>
                      <td className={`${td} whitespace-nowrap tabular-nums`} dir="ltr">{fmt(i.unitPrice)} <span className="text-xs text-cocoa">{i.priceCurrency}</span></td>
                      <td className={td}><Money amounts={i.amounts} field="value" /></td>
                      <td className={td}><Money amounts={i.amounts} field="shipping" /></td>
                      <td className={td}><Money amounts={i.amounts} field="customs" /></td>
                      <td className={`${td} font-bold`}><Money amounts={i.amounts} field="required" /></td>
                      {canCost && <td className={`${td} text-cocoa`}><Money amounts={i.amounts} field="cost" /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card className="p-5">
            <h2 className="mb-3 text-base font-bold">{t('quotations.info')}</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
              <Info label={t('quotations.contact')} value={q.customer.contactPersonName || q.customer.contactPersonPhone ? <>{q.customer.contactPersonName && <bdi>{q.customer.contactPersonName}</bdi>}{q.customer.contactPersonName && q.customer.contactPersonPhone && ' - '}{q.customer.contactPersonPhone && <bdi dir="ltr">{q.customer.contactPersonPhone}</bdi>}</> : null} />
              <Info label={t('common.country')} value={q.customer.country} />
              <Info label={t('common.phone')} value={q.customer.phone ? <bdi dir="ltr">{q.customer.phone}</bdi> : null} />
              <Info label={t('common.email')} value={q.customer.email ? <bdi dir="ltr">{q.customer.email}</bdi> : null} />
              <Info label={t('quotations.responsible')} value={q.responsibleUser?.fullName} />
              <Info label={t('quotations.bank')} value={q.bankName} />
              <Info label={t('quotations.validity')} value={q.validity} />
              <Info label={t('quotations.deliveryTime')} value={q.deliveryTime} />
              <Info label={t('quotations.paymentMethod')} value={q.paymentMethod} />
              <Info label={t('quotations.paymentLocation')} value={q.paymentLocation} />
              <Info label={t('quotations.deliveryMethod')} value={q.deliveryMethod} />
              <Info label={t('quotations.customerPayment')} value={q.customerPaymentMethod} />
              <Info label={t('quotations.tax')} value={q.taxPercentage ? `${fmt(q.taxPercentage)}%` : null} />
            </dl>
          </Card>
          {q.notes && (
            <Card className="p-5">
              <h2 className="mb-1 text-sm font-bold text-cocoa">{t('quotations.internalNotes')}</h2>
              <p className="whitespace-pre-wrap text-sm">{q.notes}</p>
            </Card>
          )}
        </div>
        <aside className="lg:col-span-4">
          <section className="rounded-3xl bg-gradient-to-b from-ink to-cocoa p-5 text-sand shadow-lift">
            <h2 className="mb-3 text-sm font-bold text-white">{t('quotations.perCurrency')}</h2>
            <Ledger totals={q.totals} showCost={canCost} />
          </section>
        </aside>
      </div>
    </div>
  );
}
