'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { toastError } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { aggregate, calcItem, fmt, trimDec } from '@/lib/money';
import { hasRole, type Customer, type Material, type Paginated, type QuotationView } from '@/lib/types';

type PickCustomer = Pick<Customer, 'id' | 'companyNameAr' | 'companyNameEn'> & Partial<Customer>;
type PickMaterial = Pick<Material, 'id' | 'materialCode' | 'nameAr' | 'nameEn'> & Partial<Material>;

interface ItemForm {
  id?: number; material: PickMaterial | null; quantity: string; unit: string; unitPrice: string; priceCurrency: string;
  shippingCost: string; shippingCurrency: string; customsCost: string; customsCurrency: string;
  unitCost: string; costCurrency: string; commissionPercentage: string; notes: string;
}
interface FormValues {
  customer: PickCustomer | null; responsibleUserId: string; quotationDate: string; bankName: string; validity: string; deliveryTime: string;
  paymentMethod: string; paymentLocation: string; deliveryMethod: string; customerPaymentMethod: string; taxPercentage: string; notes: string;
  items: ItemForm[];
}

const CURRENCIES = ['USD', 'EUR', 'SYP', 'TRY', 'AED', 'SAR', 'GBP', 'JOD', 'EGP'];
const DEC = /^\d{1,14}(\.\d{1,4})?$/;
const emptyItem = (): ItemForm => ({ material: null, quantity: '1', unit: '', unitPrice: '', priceCurrency: '', shippingCost: '', shippingCurrency: '', customsCost: '', customsCurrency: '', unitCost: '', costCurrency: '', commissionPercentage: '', notes: '' });
const today = () => new Date().toISOString().slice(0, 10);

function fromView(q: QuotationView): FormValues {
  return {
    customer: { id: q.customer.id, companyNameAr: q.customer.companyNameAr, companyNameEn: q.customer.companyNameEn },
    responsibleUserId: q.responsibleUser ? String(q.responsibleUser.id) : '', quotationDate: q.quotationDate,
    bankName: q.bankName ?? '', validity: q.validity ?? '', deliveryTime: q.deliveryTime ?? '', paymentMethod: q.paymentMethod ?? '',
    paymentLocation: q.paymentLocation ?? '', deliveryMethod: q.deliveryMethod ?? '', customerPaymentMethod: q.customerPaymentMethod ?? '',
    taxPercentage: trimDec(q.taxPercentage), notes: q.notes ?? '',
    items: q.items.map((i) => ({
      id: i.id, material: i.materialId ? { id: i.materialId, materialCode: i.materialCode, nameAr: i.materialNameAr, nameEn: i.materialNameEn } : null,
      quantity: trimDec(i.quantity), unit: i.unit ?? '', unitPrice: trimDec(i.unitPrice), priceCurrency: i.priceCurrency,
      shippingCost: trimDec(i.shippingCost), shippingCurrency: i.shippingCurrency ?? '', customsCost: trimDec(i.customsCost), customsCurrency: i.customsCurrency ?? '',
      unitCost: trimDec(i.unitCost), costCurrency: i.costCurrency ?? '', commissionPercentage: trimDec(i.commissionPercentage), notes: i.notes ?? '',
    })),
  };
}

export function QuotationForm({ initial }: { initial?: QuotationView }) {
  const { t, has, pick } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe().data!;
  const settings = useSettings().data;
  const canCost = hasRole(me.role, 'manager');
  const editing = !!initial;
  const company = editing ? initial!.company : settings?.issuingCompany;

  const users = useQuery({ queryKey: ['users', 'lookup'], queryFn: () => api.get<{ id: number; fullName: string }[]>('/users/lookup') });

  const { register, control, handleSubmit, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    defaultValues: initial ? fromView(initial) : { customer: null, responsibleUserId: String(me.id), quotationDate: today(), bankName: '', validity: '', deliveryTime: '', paymentMethod: '', paymentLocation: '', deliveryMethod: '', customerPaymentMethod: '', taxPercentage: '', notes: '', items: [emptyItem()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  const customer = useWatch({ control, name: 'customer' });

  const computed = useMemo(() => (items ?? []).map((it) => {
    try {
      if (!DEC.test(it.quantity ?? '') ) return [];
      return calcItem({ ...it, unitPrice: DEC.test(it.unitPrice) ? it.unitPrice : '', unitCost: canCost && DEC.test(it.unitCost) ? it.unitCost : '', shippingCost: DEC.test(it.shippingCost) ? it.shippingCost : '', customsCost: DEC.test(it.customsCost) ? it.customsCost : '' });
    } catch { return []; }
  }), [items, canCost]);
  const totals = useMemo(() => aggregate(computed), [computed]);

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const txt = (s: string) => (editing ? (s.trim() === '' ? null : s.trim()) : s.trim() === '' ? undefined : s.trim());
      const opt = (s: string) => (s.trim() === '' ? undefined : s.trim());
      const body = {
        ...(editing ? {} : { companyId: company?.id }),
        customerId: v.customer!.id,
        responsibleUserId: v.responsibleUserId ? Number(v.responsibleUserId) : undefined,
        quotationDate: v.quotationDate || undefined,
        bankName: txt(v.bankName), validity: txt(v.validity), deliveryTime: txt(v.deliveryTime), paymentMethod: txt(v.paymentMethod),
        paymentLocation: txt(v.paymentLocation), deliveryMethod: txt(v.deliveryMethod), customerPaymentMethod: txt(v.customerPaymentMethod),
        taxPercentage: txt(v.taxPercentage), notes: txt(v.notes),
        items: v.items.map((i) => {
          const pc = opt(i.priceCurrency)?.toUpperCase();
          const withCur = (amount: string, cur: string) => opt(amount) ? { amount: opt(amount), cur: (opt(cur) ?? pc)?.toUpperCase() } : null;
          const ship = withCur(i.shippingCost, i.shippingCurrency), cust = withCur(i.customsCost, i.customsCurrency), cost = canCost ? withCur(i.unitCost, i.costCurrency) : null;
          return {
            id: i.id, materialId: i.material!.id, quantity: i.quantity.trim(), unit: opt(i.unit), unitPrice: opt(i.unitPrice), priceCurrency: pc,
            shippingCost: ship?.amount, shippingCurrency: ship?.cur, customsCost: cust?.amount, customsCurrency: cust?.cur,
            ...(canCost ? { unitCost: cost?.amount, costCurrency: cost?.cur } : {}),
            commissionPercentage: opt(i.commissionPercentage), notes: opt(i.notes),
          };
        }),
      };
      return editing ? api.patch<QuotationView>(`/quotations/${initial!.id}`, body) : api.post<QuotationView>('/quotations', body);
    },
    onSuccess: (q) => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.setQueryData(['quotation', q.id], q);
      toast.success(editing ? t('quotations.savedOk') : t('quotations.createdOk', { number: q.quotationNumber }));
      router.push(`/quotations/${q.id}`);
    },
    onError: (e) => toastError(e, t, has),
  });

  const missingCompany = !editing && !company;
  const req = { required: t('common.required') };
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
        actions={<Link href={editing ? `/quotations/${initial!.id}` : '/quotations'}><Button variant="outline">{t('common.cancel')}</Button></Link>} />

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
              <Field label={t('quotations.customer')} error={errors.customer?.message} className="sm:col-span-2 xl:col-span-2">
                <Controller control={control} name="customer" rules={{ required: t('quotations.pickCustomer') }}
                  render={({ field }) => (
                    <AsyncPick<PickCustomer> value={field.value} onChange={field.onChange} cacheKey="customers" invalid={!!errors.customer}
                      placeholder={t('quotations.customerPh')} label={(c) => pick(c.companyNameAr, c.companyNameEn)} sub={(c) => [c.country, c.contactPersonName].filter(Boolean).join(' / ')}
                      fetcher={(q) => api.get<Paginated<Customer>>('/customers', { q, limit: 20 }).then((r) => r.data)} />
                  )} />
              </Field>
              <Field label={t('quotations.date')} error={errors.quotationDate?.message}><Input type="date" dir="ltr" {...register('quotationDate', req)} /></Field>
              <Field label={t('quotations.responsible')}>
                <Select {...register('responsibleUserId')}>{users.data?.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</Select>
              </Field>
              <Field label={t('quotations.bank')}><Input maxLength={150} {...register('bankName')} /></Field>
              <Field label={t('quotations.validity')}><Input maxLength={100} {...register('validity')} /></Field>
              <Field label={t('quotations.deliveryTime')}><Input maxLength={100} {...register('deliveryTime')} /></Field>
              <Field label={t('quotations.paymentMethod')}><Input maxLength={150} {...register('paymentMethod')} /></Field>
              <Field label={t('quotations.paymentLocation')}><Input maxLength={150} {...register('paymentLocation')} /></Field>
              <Field label={t('quotations.deliveryMethod')}><Input maxLength={150} {...register('deliveryMethod')} /></Field>
              <Field label={t('quotations.customerPayment')} className="sm:col-span-2"><Input maxLength={100} placeholder={t('quotations.customerPaymentPh')} {...register('customerPaymentMethod')} /></Field>
              <Field label={t('quotations.tax')} error={errors.taxPercentage?.message}><Input inputMode="decimal" dir="ltr" {...register('taxPercentage', decRule(false))} /></Field>
              <Field label={t('quotations.internalNotes')} className="xl:col-span-2"><Textarea rows={2} {...register('notes')} /></Field>
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
                              placeholder={t('quotations.materialPh')} label={(m) => `${m.materialCode} - ${pick(m.nameAr, m.nameEn)}`}
                              sub={(m) => [m.unitPrice && `${fmt(m.unitPrice)} ${m.currency ?? ''}`, m.source].filter(Boolean).join(' / ')}
                              fetcher={(q) => api.get<Paginated<Material>>('/materials', { q, limit: 20 }).then((r) => r.data)} />
                          )} />
                      </Field>
                      <Button variant="ghost" size="sm" className="mt-1 !px-2.5" onClick={() => remove(i)} disabled={fields.length === 1} aria-label={t('quotations.removeItem')}><Trash2 className="size-4" /></Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <Field label={t('quotations.quantity')} error={e?.quantity?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.quantity`, { ...req, validate: (v) => (DEC.test(v.trim()) && Number(v) > 0) || t('common.invalid') })} /></Field>
                      <Field label={t('quotations.unit')}><Input maxLength={30} {...register(`items.${i}.unit`)} /></Field>
                      <Field label={t('quotations.unitPrice')} error={e?.unitPrice?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.unitPrice`, decRule(true))} /></Field>
                      <Field label={t('quotations.currency')} error={e?.priceCurrency?.message}><Input list="currencies" dir="ltr" maxLength={3} className="uppercase" {...register(`items.${i}.priceCurrency`, { ...req, pattern: { value: /^[A-Za-z]{3}$/, message: t('common.invalid') } })} /></Field>

                      <Field label={t('quotations.shipping')} error={e?.shippingCost?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.shippingCost`, decRule(false))} /></Field>
                      <Field label={t('quotations.currency')}><Input list="currencies" dir="ltr" maxLength={3} className="uppercase" placeholder={items?.[i]?.priceCurrency?.toUpperCase()} {...register(`items.${i}.shippingCurrency`)} /></Field>
                      <Field label={t('quotations.customs')} error={e?.customsCost?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.customsCost`, decRule(false))} /></Field>
                      <Field label={t('quotations.currency')}><Input list="currencies" dir="ltr" maxLength={3} className="uppercase" placeholder={items?.[i]?.priceCurrency?.toUpperCase()} {...register(`items.${i}.customsCurrency`)} /></Field>

                      {canCost && (<>
                        <Field label={t('quotations.cost')} error={e?.unitCost?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.unitCost`, decRule(false))} /></Field>
                        <Field label={t('quotations.currency')}><Input list="currencies" dir="ltr" maxLength={3} className="uppercase" placeholder={items?.[i]?.priceCurrency?.toUpperCase()} {...register(`items.${i}.costCurrency`)} /></Field>
                      </>)}
                      <Field label={t('quotations.commission')} error={e?.commissionPercentage?.message}><Input inputMode="decimal" dir="ltr" {...register(`items.${i}.commissionPercentage`, decRule(false))} /></Field>
                      {canCost && (amounts.length > 0 ? (
                      <div className="col-span-2 flex flex-col justify-end gap-1.5 md:col-span-1" dir="ltr">
                        {amounts.map((a) => (
                          <span key={a.currency} className="inline-flex items-center justify-between gap-2 rounded-full bg-ink px-3.5 py-1.5 text-xs text-sand">
                            <b className="rounded-full bg-sand px-2 text-ink">{a.currency}</b>
                            <b className="tabular-nums text-white">{fmt(a.required)}</b>
                          </span>
                        ))}
                      </div>
                    ) : <div className="hidden md:block" />)}
                      <Field label={t('quotations.itemNotes')} className={canCost ? 'col-span-2 md:col-span-4' : 'col-span-2 md:col-span-3'}><Input {...register(`items.${i}.notes`)} /></Field>
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
                  ? <img src={`/uploads/${company.logo}`} alt="" className="size-11 rounded-full bg-white object-contain" />
                  : <span className="grid size-11 place-items-center rounded-full bg-sand text-ink"><Building2 className="size-5" /></span>}
                <div className="min-w-0 leading-tight">
                  <div className="text-xs text-stone">{t('quotations.issuingCompany')}</div>
                  <div className="truncate text-base font-bold text-white">{company ? pick(company.nameAr, company.nameEn) : '—'}</div>
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
                <div className="flex items-center justify-between gap-3"><dt className="text-cocoa">{t('quotations.customer')}</dt><dd dir="auto" className="min-w-0 truncate font-semibold">{customer ? pick(customer.companyNameAr, customer.companyNameEn) : '—'}</dd></div>
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
