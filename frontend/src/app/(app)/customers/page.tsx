'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
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

type Form = { companyName: string; email: string; country: string; website: string; managerName: string; businessNature: string; notes: string };
const blank: Form = { companyName: '', email: '', country: '', website: '', managerName: '', businessNature: '', notes: '' };
const toForm = (c: Customer): Form => Object.fromEntries(Object.keys(blank).map((k) => [k, (c as unknown as Record<string, string | null>)[k] ?? ''])) as Form;

function CustomerModal({ customer, onClose }: { customer: Customer | 'new'; onClose: () => void }) {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const editing = customer !== 'new';
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: editing ? toForm(customer) : blank });
  const [phones, setPhones] = useState<string[]>(editing && customer.phone?.length ? customer.phone : ['']);
  const [phoneErr, setPhoneErr] = useState(false);
  const req = { required: t('common.required'), validate: (v: string) => v.trim() !== '' || t('common.required') };
  const save = useMutation({
    mutationFn: (v: Form & { phone: string[] }) => {
      const { phone, ...rest } = v;
      const body = { ...cleanBody(rest, editing), phone };
      return editing ? api.patch(`/customers/${customer.id}`, body) : api.post('/customers', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); qc.invalidateQueries({ queryKey: ['pick'] }); toast.success(t('common.saved')); onClose(); },
    onError: (e) => toastError(e, t, has),
  });
  function submit(v: Form) {
    const list = phones.map((p) => p.trim()).filter(Boolean);
    setPhoneErr(list.length === 0);
    if (list.length) save.mutate({ ...v, phone: list });
  }
  return (
    <Modal open wide title={editing ? t('customers.edit') : t('customers.new')} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button loading={save.isPending} onClick={handleSubmit(submit)}>{t('common.save')}</Button></>}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)}>
        <Field label={t('common.name')} required error={errors.companyName?.message}><Input maxLength={190} {...register('companyName', req)} /></Field>
        <Field label={t('common.email')} required error={errors.email?.message}><Input type="email" dir="ltr" maxLength={150} {...register('email', req)} /></Field>
        <Field label={t('common.country')} required error={errors.country?.message}><Input maxLength={100} {...register('country', req)} /></Field>
        <Field label={t('common.website')}><Input dir="ltr" maxLength={150} {...register('website')} /></Field>
        <Field label={t('customers.manager')} required error={errors.managerName?.message}><Input maxLength={150} {...register('managerName', req)} /></Field>
        <Field label={t('customers.nature')} required error={errors.businessNature?.message}><Input maxLength={190} {...register('businessNature', req)} /></Field>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-cocoa">{t('common.phone')}<span className="ms-0.5 text-red-600" aria-hidden>*</span></span>
          <div className="space-y-2">
            {phones.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input dir="ltr" maxLength={60} value={p} onChange={(e) => setPhones((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
                <Button variant="ghost" size="sm" className="!px-2.5" disabled={phones.length === 1} aria-label={t('quotations.removeItem')} onClick={() => setPhones((l) => l.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <Button variant="soft" size="sm" disabled={phones.length >= 10} onClick={() => setPhones((l) => [...l, ''])}><Plus className="size-4" />{t('customers.addPhone')}</Button>
          </div>
          {phoneErr && <span className="mt-1 block text-xs font-medium text-red-700">{t('common.required')}</span>}
        </div>
        <Field label={t('common.notes')} className="sm:col-span-2"><Textarea {...register('notes')} /></Field>
        <button type="submit" hidden />
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
    if (c.isActive && !(await confirm({ danger: true, title: t('common.deactivateTitle'), confirmText: t('common.deactivate'), message: t('common.deactivateMsg', { name: c.companyName ?? '' }) }))) return;
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
              <thead><tr><th className={th}>{t('common.name')}</th><th className={th}>{t('common.country')}</th><th className={th}>{t('common.phone')}</th><th className={th}>{t('customers.manager')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
              <tbody>
                {list.data.data.map((c) => (
                  <tr key={c.id} className={tr}>
                    <td className={td}><div className="font-bold">{c.companyName ?? ''}</div>{c.email && <div className="text-xs text-cocoa" dir="ltr">{c.email}</div>}</td>
                    <td className={td}>{c.country ?? '—'}</td>
                    <td className={td} dir="ltr">{c.phone?.length ? c.phone.map((p) => <div key={p}>{p}</div>) : '—'}</td>
                    <td className={td}>{c.managerName ?? '—'}</td>
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
