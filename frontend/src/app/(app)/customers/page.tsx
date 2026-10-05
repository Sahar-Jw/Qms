'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm';
import { ActiveBadge, Button, Card, Empty, Field, Input, Loading, Modal, PageHeader, Pagination, Select, Textarea, td, th, tr } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { toastError } from '@/lib/errors';
import { cleanBody, useDebounced } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { hasRole, type Customer, type Paginated } from '@/lib/types';

type Form = { companyNameAr: string; companyNameEn: string; email: string; phone: string; country: string; website: string; managerName: string; contactPersonName: string; contactPersonPhone: string; businessNature: string; notes: string };
const blank: Form = { companyNameAr: '', companyNameEn: '', email: '', phone: '', country: '', website: '', managerName: '', contactPersonName: '', contactPersonPhone: '', businessNature: '', notes: '' };
const toForm = (c: Customer): Form => Object.fromEntries(Object.keys(blank).map((k) => [k, (c as unknown as Record<string, string | null>)[k] ?? ''])) as Form;

function CustomerModal({ customer, onClose }: { customer: Customer | 'new'; onClose: () => void }) {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const editing = customer !== 'new';
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({ defaultValues: editing ? toForm(customer) : blank });
  const [ar, en] = watch(['companyNameAr', 'companyNameEn']);
  const save = useMutation({
    mutationFn: (v: Form) => (editing ? api.patch(`/customers/${customer.id}`, cleanBody(v, true)) : api.post('/customers', cleanBody(v, false))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['pick'] }); toast.success(t('common.saved')); onClose(); },
    onError: (e) => toastError(e, t, has),
  });
  const noName = !ar.trim() && !en.trim();
  return (
    <Modal open wide title={editing ? t('customers.edit') : t('customers.new')} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>{t('common.save')}</Button></>}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <Field label={t('customers.nameAr')} error={noName ? t('customers.nameHint') : undefined}><Input maxLength={190} {...register('companyNameAr')} /></Field>
        <Field label={t('customers.nameEn')}><Input maxLength={190} dir="ltr" {...register('companyNameEn')} /></Field>
        <Field label={t('common.email')} error={errors.email?.message}><Input type="email" dir="ltr" {...register('email')} /></Field>
        <Field label={t('common.phone')}><Input dir="ltr" {...register('phone')} /></Field>
        <Field label={t('common.country')}><Input {...register('country')} /></Field>
        <Field label={t('common.website')}><Input dir="ltr" {...register('website')} /></Field>
        <Field label={t('customers.manager')}><Input {...register('managerName')} /></Field>
        <Field label={t('customers.nature')}><Input {...register('businessNature')} /></Field>
        <Field label={t('customers.contactPerson')}><Input {...register('contactPersonName')} /></Field>
        <Field label={t('customers.contactPhone')}><Input dir="ltr" {...register('contactPersonPhone')} /></Field>
        <Field label={t('common.notes')} className="sm:col-span-2"><Textarea {...register('notes')} /></Field>
        <button type="submit" hidden disabled={noName} />
      </form>
    </Modal>
  );
}

export default function CustomersPage() {
  const { t, pick, has } = useI18n();
  const me = useMe().data!;
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Customer | 'new' | null>(null);
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, status]);
  const list = useQuery({ queryKey: ['customers', dq, status, page], queryFn: () => api.get<Paginated<Customer>>('/customers', { q: dq, status, page, limit: 15 }), placeholderData: (p) => p });
  const toggle = useMutation({
    mutationFn: (c: Customer) => api.patch(`/customers/${c.id}/active`, { isActive: !c.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
    onError: (e) => toastError(e, t, has),
  });
  async function onToggle(c: Customer) {
    if (c.isActive && !(await confirm({ danger: true, title: t('common.deactivateTitle'), confirmText: t('common.deactivate'), message: t('common.deactivateMsg', { name: pick(c.companyNameAr, c.companyNameEn) }) }))) return;
    toggle.mutate(c);
  }

  return (
    <>
      <PageHeader title={t('customers.title')} sub={list.data ? `${list.data.total} ${t('common.results')}` : undefined}
        actions={<Button onClick={() => setEdit('new')}><Plus className="size-4" />{t('customers.new')}</Button>} />
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="relative"><Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-clay" /><Input className="ps-10" placeholder={t('customers.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="active">{t('common.active')}</option><option value="inactive">{t('common.inactive')}</option><option value="all">{t('common.all')}</option>
        </Select>
      </Card>
      <Card>
        {list.isLoading ? <Loading /> : !list.data?.data.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead><tr><th className={th}>{t('common.name')}</th><th className={th}>{t('common.country')}</th><th className={th}>{t('common.phone')}</th><th className={th}>{t('customers.contactPerson')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
              <tbody>
                {list.data.data.map((c) => (
                  <tr key={c.id} className={tr}>
                    <td className={td}><div className="font-bold">{pick(c.companyNameAr, c.companyNameEn)}</div>{c.email && <div className="text-xs text-cocoa" dir="ltr">{c.email}</div>}</td>
                    <td className={td}>{c.country ?? '—'}</td>
                    <td className={td} dir="ltr">{c.phone ?? '—'}</td>
                    <td className={td}>{c.contactPersonName ?? '—'}{c.contactPersonPhone && <div className="text-xs text-cocoa" dir="ltr">{c.contactPersonPhone}</div>}</td>
                    <td className={td}><ActiveBadge active={c.isActive} /></td>
                    <td className={`${td} whitespace-nowrap text-end`}>
                      <Button size="sm" variant="ghost" onClick={() => setEdit(c)}><Pencil className="size-4" />{t('common.edit')}</Button>
                      {hasRole(me.role, 'manager') && <Button size="sm" variant="ghost" onClick={() => onToggle(c)}><Power className="size-4" />{c.isActive ? t('common.deactivate') : t('common.activate')}</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} />}
      </Card>
      {edit && <CustomerModal customer={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
