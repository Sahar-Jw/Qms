'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm';
import { ActiveBadge, Button, Card, Empty, Field, Input, Loading, Modal, PageHeader, Pagination, Select, td, th, tr } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { toastError } from '@/lib/errors';
import { cleanBody, useDebounced } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { fmt, trimDec } from '@/lib/money';
import { hasRole, type Material, type Paginated } from '@/lib/types';

type Form = { materialCode: string; nameAr: string; nameEn: string; source: string; stockQuantity: string; unitPrice: string; unit: string; currency: string; countryOfOrigin: string; catalogue: string; modelNumber: string; catalogueNumber: string };
const blank: Form = { materialCode: '', nameAr: '', nameEn: '', source: '', stockQuantity: '', unitPrice: '', unit: '', currency: '', countryOfOrigin: '', catalogue: '', modelNumber: '', catalogueNumber: '' };
const toForm = (m: Material): Form => {
  const f = Object.fromEntries(Object.keys(blank).map((k) => [k, (m as unknown as Record<string, string | null>)[k] ?? ''])) as Form;
  return { ...f, stockQuantity: trimDec(m.stockQuantity), unitPrice: trimDec(m.unitPrice) };
};
const DEC = /^\d{1,14}(\.\d{1,4})?$/;

function MaterialModal({ material, onClose }: { material: Material | 'new'; onClose: () => void }) {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const editing = material !== 'new';
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({ defaultValues: editing ? toForm(material) : blank });
  const [ar, en] = watch(['nameAr', 'nameEn']);
  const save = useMutation({
    mutationFn: (v: Form) => {
      const body = cleanBody(v, editing);
      if (body.currency) body.currency = String(body.currency).toUpperCase();
      // numbers can't be null on the backend: leave them out when empty
      for (const k of ['stockQuantity', 'unitPrice'] as const) if (body[k] === null) delete body[k];
      return editing ? api.patch(`/materials/${material.id}`, body) : api.post('/materials', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); qc.invalidateQueries({ queryKey: ['pick'] }); toast.success(t('common.saved')); onClose(); },
    onError: (e) => toastError(e, t, has),
  });
  const noName = !ar.trim() && !en.trim();
  const dec = { validate: (v: string) => !v || DEC.test(v.trim()) || t('common.invalid') };
  return (
    <Modal open wide title={editing ? t('materials.edit') : t('materials.new')} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>{t('common.save')}</Button></>}>
      <form className="grid gap-4 sm:grid-cols-2 md:grid-cols-3" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <Field label={t('materials.code')} error={errors.materialCode?.message}><Input dir="ltr" maxLength={60} {...register('materialCode', { required: t('common.required') })} /></Field>
        <Field label={t('materials.nameAr')} error={noName ? t('customers.nameHint') : undefined} className="md:col-span-1"><Input maxLength={255} {...register('nameAr')} /></Field>
        <Field label={t('materials.nameEn')}><Input dir="ltr" maxLength={255} {...register('nameEn')} /></Field>
        <Field label={t('materials.unitPrice')} error={errors.unitPrice?.message}><Input inputMode="decimal" dir="ltr" {...register('unitPrice', dec)} /></Field>
        <Field label={t('materials.currency')} error={errors.currency?.message}><Input dir="ltr" maxLength={3} className="uppercase" {...register('currency', { pattern: { value: /^[A-Za-z]{3}$/, message: t('common.invalid') } })} /></Field>
        <Field label={t('materials.unit')}><Input maxLength={30} {...register('unit')} /></Field>
        <Field label={t('materials.stock')} error={errors.stockQuantity?.message}><Input inputMode="decimal" dir="ltr" {...register('stockQuantity', dec)} /></Field>
        <Field label={t('materials.source')}><Input {...register('source')} /></Field>
        <Field label={t('materials.origin')}><Input {...register('countryOfOrigin')} /></Field>
        <Field label={t('materials.catalogue')}><Input {...register('catalogue')} /></Field>
        <Field label={t('materials.model')}><Input dir="ltr" {...register('modelNumber')} /></Field>
        <Field label={t('materials.catalogueNo')}><Input dir="ltr" {...register('catalogueNumber')} /></Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function MaterialsPage() {
  const { t, pick, has } = useI18n();
  const me = useMe().data!;
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Material | 'new' | null>(null);
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, status]);
  const list = useQuery({ queryKey: ['materials', dq, status, page], queryFn: () => api.get<Paginated<Material>>('/materials', { q: dq, status, page, limit: 15 }), placeholderData: (p) => p });
  const toggle = useMutation({
    mutationFn: (m: Material) => api.patch(`/materials/${m.id}/active`, { isActive: !m.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['materials'] }),
    onError: (e) => toastError(e, t, has),
  });
  async function onToggle(m: Material) {
    if (m.isActive && !(await confirm({ danger: true, title: t('common.deactivateTitle'), confirmText: t('common.deactivate'), message: t('common.deactivateMsg', { name: pick(m.nameAr, m.nameEn) }) }))) return;
    toggle.mutate(m);
  }

  return (
    <>
      <PageHeader title={t('materials.title')} sub={list.data ? `${list.data.total} ${t('common.results')}` : undefined}
        actions={<Button onClick={() => setEdit('new')}><Plus className="size-4" />{t('materials.new')}</Button>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="relative"><Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-clay" /><Input className="ps-10" placeholder={t('materials.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">{t('common.active')}</option><option value="inactive">{t('common.inactive')}</option><option value="all">{t('common.all')}</option>
        </Select>
      </Card>
      <Card>
        {list.isLoading ? <Loading /> : !list.data?.data.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead><tr><th className={th}>{t('materials.code')}</th><th className={th}>{t('common.name')}</th><th className={th}>{t('materials.unitPrice')}</th><th className={th}>{t('materials.stock')}</th><th className={th}>{t('materials.source')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
              <tbody>
                {list.data.data.map((m) => (
                  <tr key={m.id} className={tr}>
                    <td className={`${td} font-bold`} dir="ltr">{m.materialCode}</td>
                    <td className={td}>{pick(m.nameAr, m.nameEn)}</td>
                    <td className={`${td} whitespace-nowrap tabular-nums`} dir="ltr">{fmt(m.unitPrice)} <span className="text-xs text-cocoa">{m.currency}</span></td>
                    <td className={`${td} tabular-nums`} dir="ltr">{fmt(m.stockQuantity, 3)} <span className="text-xs text-cocoa">{m.unit}</span></td>
                    <td className={td}>{m.source ?? '—'}</td>
                    <td className={td}><ActiveBadge active={m.isActive} /></td>
                    <td className={`${td} whitespace-nowrap text-end`}>
                      <Button size="sm" variant="ghost" onClick={() => setEdit(m)}><Pencil className="size-4" />{t('common.edit')}</Button>
                      {hasRole(me.role, 'manager') && <Button size="sm" variant="ghost" onClick={() => onToggle(m)}><Power className="size-4" />{m.isActive ? t('common.deactivate') : t('common.activate')}</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} />}
      </Card>
      {edit && <MaterialModal material={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
