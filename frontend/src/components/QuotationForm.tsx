'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quotationHref, uploadUrl } from '@/lib/urls';
import { AlertTriangle, Building2, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { AsyncPick } from '@/components/AsyncPick';
import { Ledger } from '@/components/Totals';
import { Button, Card, CardHeader, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe, useSettings } from '@/lib/auth';
import { daysUntil } from '@/lib/dates';
import { toastError } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { aggregate, calcItem, fmt, trimDec } from '@/lib/money';
import { hasRole, type Customer, type Material, type Paginated, type QuotationView } from '@/lib/types';

type PickCustomer = Pick<Customer, 'id' | 'companyName'> & Partial<Customer>;
type PickMaterial = Pick<Material, 'id' | 'materialCode' | 'name'> & Partial<Material>;

interface ItemForm {
  id?: number; material: PickMaterial | null; quantity: string; unit: string; unitPrice: string; priceCurrency: string;
  shippingCost: string; shippingCurrency: string; customsCost: string; customsCurrency: string;
  unitCost: string; costCurrency: string; commissionPercentage: string; notes: string;
}
interface FormValues {
  customer: PickCustomer | null; responsibleUserId: string; quotationDate: string; bankName: string; validity: string;
  paymentMethod: string; paymentLocation: string; deliveryMethod: string; customerPaymentMethod: string; notes: string;
  items: ItemForm[];
}

const CURRENCIES = ['USD', 'EUR', 'SYP', 'TRY', 'AED', 'SAR', 'GBP', 'JOD', 'EGP'];
const DEC = /^\d{1,14}(\.\d{1,4})?$/;
const emptyItem = (): ItemForm => ({ material: null, quantity: '1', unit: '', unitPrice: '', priceCurrency: '', shippingCost: '', shippingCurrency: '', customsCost: '', customsCurrency: '', unitCost: '', costCurrency: '', commissionPercentage: '', notes: '' });
const today = () => new Date().toISOString().slice(0, 10);
const isoDate = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

function fromView(q: QuotationView): FormValues {
  return {
    customer: { id: q.customer.id, companyName: q.customer.companyName },
    responsibleUserId: q.responsibleUser ? String(q.responsibleUser.id) : '', quotationDate: q.quotationDate,
    bankName: q.bankName ?? '', validity: isoDate(q.validity), paymentMethod: q.paymentMethod ?? '',
    paymentLocation: q.paymentLocation ?? '', deliveryMethod: q.deliveryMethod ?? '', customerPaymentMethod: q.customerPaymentMethod ?? '',
    notes: q.notes ?? '',
    items: q.items.map((i) => ({
      id: i.id, material: i.materialId ? { id: i.materialId, materialCode: i.materialCode, name: i.materialName } : null,
      quantity: trimDec(i.quantity), unit: i.unit ?? '', unitPrice: trimDec(i.unitPrice), priceCurrency: i.priceCurrency,
      shippingCost: trimDec(i.shippingCost), shippingCurrency: i.priceCurrency, customsCost: trimDec(i.customsCost), customsCurrency: i.priceCurrency,
      unitCost: trimDec(i.unitCost), costCurrency: i.priceCurrency, commissionPercentage: trimDec(i.commissionPercentage), notes: i.notes ?? '',
    })),
  };
}

export function QuotationForm({ initial }: { initial?: QuotationView }) {
  const { t, has, lang } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe().data!;
  const settings = useSettings().data;
  const canCost = hasRole(me.role, 'manager');
  const editing = !!initial;
  const company = editing ? initial!.company : settings?.issuingCompany;

  const users = useQuery({ queryKey: ['users', 'lookup'], queryFn: () => api.get<{ id: number; fullName: string }[]>('/users/lookup'), enabled: editing });

  const { register, control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    defaultValues: initial ? fromView(initial) : { customer: null, responsibleUserId: String(me.id), quotationDate: today(), bankName: '', validity: '', paymentMethod: '', paymentLocation: '', deliveryMethod: '', customerPaymentMethod: '', notes: '', items: [emptyItem()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  const customer = useWatch({ control, name: 'customer' });
  const quotationDate = useWatch({ control, name: 'quotationDate' });
  const validity = useWatch({ control, name: 'validity' });
  const remainingDays = daysUntil(validity);
  const remainingDaysText = remainingDays === null
    ? '—'
    : remainingDays < 0
      ? t('quotations.expired')
      : remainingDays === 1
        ? t('quotations.oneDayRemaining')
        : t('quotations.daysRemaining', { days: new Intl.NumberFormat(lang).format(remainingDays) });

  const computed = useMemo(() => (items ?? []).map((it) => {
    try {
      if (!DEC.test(it.quantity ?? '') ) return [];
      return calcItem({ ...it, shippingCurrency: it.priceCurrency, customsCurrency: it.priceCurrency, costCurrency: it.priceCurrency, unitPrice: DEC.test(it.unitPrice) ? it.unitPrice : '', unitCost: canCost && DEC.test(it.unitCost) ? it.unitCost : '', shippingCost: DEC.test(it.shippingCost) ? it.shippingCost : '', customsCost: DEC.test(it.customsCost) ? it.customsCost : '' });
    } catch { return []; }
  }), [items, canCost]);
  const totals = useMemo(() => aggregate(computed), [computed]);

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const str = (s: string) => s.trim();
      const body = {
        ...(editing ? {} : { companyId: company?.id }),
        customerId: v.customer!.id,
        ...(editing ? { responsibleUserId: Number(v.responsibleUserId) } : {}),
        quotationDate: v.quotationDate,
        bankName: str(v.bankName), validity: v.validity, paymentMethod: str(v.paymentMethod),
        paymentLocation: str(v.paymentLocation), deliveryMethod: str(v.deliveryMethod), customerPaymentMethod: str(v.customerPaymentMethod),
        notes: editing ? (str(v.notes) || null) : (str(v.notes) || undefined),
        items: v.items.map((i) => {
          const cur = i.priceCurrency.trim().toUpperCase(); // one currency for price, shipping, customs and cost
          return {
            id: i.id, materialId: i.material!.id, quantity: str(i.quantity), unit: str(i.unit), unitPrice: str(i.unitPrice), priceCurrency: cur,
            shippingCost: str(i.shippingCost), shippingCurrency: cur, customsCost: str(i.customsCost), customsCurrency: cur,
            ...(canCost ? { unitCost: str(i.unitCost), costCurrency: cur } : {}),
            commissionPercentage: str(i.commissionPercentage), notes: str(i.notes) || undefined,
          };
        }),
      };
      return editing ? api.patch<QuotationView>(`/quotations/${initial!.id}`, body) : api.post<QuotationView>('/quotations', body);
    },
    onSuccess: (q) => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.setQueryData(['quotation', q.id], q);
      toast.success(editing ? t('quotations.savedOk') : t('quotations.createdOk', { number: q.quotationNumber }));
      router.push(quotationHref(q.id));
    },
    onError: (e) => toastError(e, t, has),
  });

  const missingCompany = !editing && !company;
  const req = { required: t('common.required') };
  const reqText = { required: t('common.required'), validate: (v: string) => v.trim() !== '' || t('common.required') };
  const decRule = (required: boolean) => ({
    ...(required ? req : {}),
    validate: (v: string) => !v || DEC.test(v.trim()) || t('common.invalid'),
  });

  function onMaterial(i: number, m: Material | null) {
    setValue(`items.${i}.material`, m, { shouldValidate: true });
    if (m) {
      setValue(`items.${i}.unit`, m.unit ?? '');
      setValue(`items.${i}.unitPrice`, trimDec(m.unitPrice));
      setValue(`items.${i}.priceCurrency`, m.currency ?? getValues(`items.${i}.priceCurrency`));
    }
  }

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <PageHeader title={editing ? t('quotations.editTitle', { number: initial!.quotationNumber }) : t('quotations.newTitle')}
        actions={<Link href={editing ? quotationHref(initial!.id) : '/quotations'}><Button variant="outline">{t('common.cancel')}</Button></Link>} />

      {missingCompany && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-sm text-sand">
          <AlertTriangle className="size-5 shrink-0 text-clay" />{t('quotations.companyMissing')}
          <Link href="/settings" className="ms-auto shrink-0 rounded-full bg-sand px-4 py-1.5 font-bold text-ink">{t('nav.settings')}</Link>
        </div>
      )}

      <datalist id="currencies">{CURRENCIES.map((c) => <option key={c} value={c} />)}</datalist>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card>
            <CardHeader title={t('quotations.details')} />
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              <Field label={t('quotations.customer')} required error={errors.customer?.message} className="sm:col-span-2 xl:col-span-2">
                <Controller control={control} name="customer" rules={{ required: t('quotations.pickCustomer') }}
                  render={({ field }) => (
                    <AsyncPick<PickCustomer> value={field.value} onChange={field.onChange} cacheKey="customers" invalid={!!errors.customer}
                      placeholder={t('quotations.customerPh')} label={(c) => c.companyName ?? ''} sub={(c) => [c.country, c.managerName].filter(Boolean).join(' / ')}
                      fetcher={(q) => api.get<Paginated<Customer>>('/customers', { q, limit: 20 }).then((r) => r.data)} />
                  )} />
              </Field>
              <Field label={t('quotations.date')} required error={errors.quotationDate?.message}><Input type="date" dir="ltr" {...register('quotationDate', req)} /></Field>
              {editing && <Field label={t('quotations.responsible')} required error={errors.responsibleUserId?.message}>
                <Select {...register('responsibleUserId', req)}>{users.data?.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</Select>
              </Field>}
              <Field label={t('quotations.bank')} required error={errors.bankName?.message}><Input maxLength={150} {...register('bankName', reqText)} /></Field>
              <Field label={t('quotations.validity')} required error={errors.validity?.message}>
                <Input type="date" dir="ltr" min={quotationDate || undefined}
                  {...register('validity', {
                    ...req,
                    validate: (value) => !value || !quotationDate || value >= quotationDate || t('err.VALIDITY_BEFORE_QUOTATION_DATE'),
                  })} />
              </Field>
              <Field label={t('quotations.deliveryTime')}>
                <div className="flex h-10 items-center rounded-xl border border-stone bg-sand/50 px-3.5 text-sm font-semibold text-cocoa" dir="auto">
                  {remainingDaysText}
                </div>
              </Field>
              <Field label={t('quotations.paymentMethod')} required error={errors.paymentMethod?.message}><Input maxLength={150} {...register('paymentMethod', reqText)} /></Field>
              <Field label={t('quotations.paymentLocation')} required error={errors.paymentLocation?.message}><Input maxLength={150} {...register('paymentLocation', reqText)} /></Field>
              <Field label={t('quotations.deliveryMethod')} required error={errors.deliveryMethod?.message}><Input maxLength={150} {...register('deliveryMethod', reqText)} /></Field>
              <Field label={t('quotations.customerPayment')} required error={errors.customerPaymentMethod?.message} className="sm:col-span-2 xl:col-span-3"><Input maxLength={100} placeholder={t('quotations.customerPaymentPh')} {...register('customerPaymentMethod', reqText)} /></Field>
              <Field label={t('quotations.internalNotes')} className="sm:col-span-2 xl:col-span-3"><Textarea rows={2} {...register('notes')} /></Field>
            </div>
          </Card>

          <Card>
            <CardHeader title={<>{t('quotations.items')} <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-cocoa">{fields.length}</span></>}
              actions={<Button size="sm" variant="soft" onClick={() => append(emptyItem())}><Plus className="size-4" />{t('quotations.addItem')}</Button>} />
            <div className="space-y-3 p-4">
              {fields.map((f, i) => {
                const e = errors.items?.[i];
                const amounts = computed[i] ?? [];
                return (
                  <div key={f.id} className="rounded-2xl border border-stone/60 bg-sand/35 p-4">
                    <div className="mb-3 flex items-start gap-3">
                      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-sand">{i + 1}</span>
                      <Field className="flex-1" error={e?.material?.message}>
                        <Controller control={control} name={`items.${i}.material`} rules={{ required: t('quotations.pickMaterial') }}
                          render={({ field }) => (
                            <AsyncPick<PickMaterial> value={field.value} onChange={(m) => onMaterial(i, m as Material | null)} cacheKey="materials" invalid={!!e?.material}
                              placeholder={t('quotations.materialPh')} label={(m) => `${m.materialCode} - ${m.name ?? ''}`}
                              sub={(m) => [m.unitPrice && `${fmt(m.unitPrice)} ${m.currency ?? ''}`, m.source].filter(Boolean).join(' / ')}
                              fetcher={(q) => api.get<Paginated<Material>>('/materials', { q, limit: 20 }).then((r) => r.data)} />
                          )} />
                      </Field>
                      <Button variant="ghost" size="sm" className="mt-1 !px-2.5" onClick={() => remove(i)} disabled={fields.length === 1} aria-label={t('quotations.removeItem')}><Trash2 className="size-4" /></Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Field label={t('quotations.quantity')} required error={e?.quantity?.message}>
                        <Input type="number" min={0} step={1} dir="ltr" onWheel={(ev) => ev.currentTarget.blur()}
                          {...register(`items.${i}.quantity`, { ...req, validate: (v) => (DEC.test(String(v).trim()) && Number(v) > 0) || t('common.invalid') })} />
                      </Field>
                      <Field label={t('quotations.unit')} required error={e?.unit?.message}><Input maxLength={30} {...register(`items.${i}.unit`, reqText)} /></Field>
                      <Field label={t('quotations.unitPrice')} required error={e?.unitPrice?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.unitPrice`, decRule(true))} /></Field>
                      <Field label={t('quotations.currency')} required error={e?.priceCurrency?.message}><Input list="currencies" dir="ltr" maxLength={3} className="uppercase" {...register(`items.${i}.priceCurrency`, { ...req, pattern: { value: /^[A-Za-z]{3}$/, message: t('common.invalid') } })} /></Field>

                      <Field label={t('quotations.shipping')} required error={e?.shippingCost?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.shippingCost`, decRule(true))} /></Field>
                      <Field label={t('quotations.customs')} required error={e?.customsCost?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.customsCost`, decRule(true))} /></Field>
                      {canCost && <Field label={t('quotations.cost')} required error={e?.unitCost?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.unitCost`, decRule(true))} /></Field>}
                      <Field label={t('quotations.commission')} required error={e?.commissionPercentage?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.commissionPercentage`, decRule(true))} /></Field>

                      <Field label={t('quotations.itemNotes')} className={canCost ? 'col-span-2 md:col-span-3' : 'col-span-2 md:col-span-4'}><Input {...register(`items.${i}.notes`)} /></Field>
                      {canCost && (
                        <div className="col-span-2 flex flex-col justify-end gap-1.5 md:col-span-1" dir="ltr">
                          {amounts.map((a) => (
                            <span key={a.currency} className="inline-flex items-center justify-between gap-2 rounded-full bg-ink px-3.5 py-1.5 text-xs text-sand">
                              <b className="rounded-full bg-sand px-2 text-ink">{a.currency}</b>
                              <b className="tabular-nums text-white">{fmt(a.required)}</b>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {!canCost && amounts.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2" dir="ltr">
                        {amounts.map((a) => (
                          <span key={a.currency} className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1 text-xs text-sand">
                            <b className="rounded-full bg-sand px-2 text-ink">{a.currency}</b>
                            {t('quotations.required')} <b className="tabular-nums text-white">{fmt(a.required)}</b>
                          </span>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })}
              <Button variant="outline" className="w-full" onClick={() => append(emptyItem())}><Plus className="size-4" />{t('quotations.addItem')}</Button>
            </div>
          </Card>
        </div>

        <aside className="lg:col-span-4">
          <div className="space-y-4 lg:sticky lg:top-20">
            <section className="rounded-3xl bg-gradient-to-b from-ink to-cocoa p-5 text-sand shadow-lift">
              <div className="mb-4 flex items-center gap-3">
                {company?.logo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={uploadUrl(company.logo)} alt="" className="size-11 rounded-full bg-white object-contain" />
                  : <span className="grid size-11 place-items-center rounded-full bg-sand text-ink"><Building2 className="size-5" /></span>}
                <div className="min-w-0 leading-tight">
                  <div className="text-xs text-stone">{t('quotations.issuingCompany')}</div>
                  <div className="truncate text-base font-bold text-white">{company ? company.name : '—'}</div>
                  {!editing && <Link href="/settings" className="text-xs underline decoration-clay underline-offset-4">{t('quotations.changeInSettings')}</Link>}
                </div>
              </div>
              <h3 className="mb-2 text-sm font-bold text-white">{t('quotations.perCurrency')}</h3>
              <Ledger totals={totals} showCost={canCost} />
              <Button type="submit" size="lg" variant="soft" className="mt-5 w-full" loading={save.isPending} disabled={missingCompany}>
                <Save className="size-4" />{editing ? t('quotations.saveEdit') : t('quotations.saveCreate')}
              </Button>
            </section>
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-bold">{t('quotations.summary')}</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3"><dt className="text-cocoa">{t('quotations.customer')}</dt><dd dir="auto" className="min-w-0 truncate font-semibold">{customer ? (customer.companyName ?? '—') : '—'}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-cocoa">{t('quotations.itemsCount')}</dt><dd className="font-semibold tabular-nums">{items?.filter((x) => x.material).length ?? 0}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-cocoa">{t('quotations.currenciesCount')}</dt><dd className="font-semibold tabular-nums" dir="ltr">{totals.map((x) => x.currency).join(' ') || '—'}</dd></div>
              </dl>
            </Card>
          </div>
        </aside>
      </div>
    </form>
  );
}
