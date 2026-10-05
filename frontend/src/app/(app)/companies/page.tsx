'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ImagePlus, Mail, Pencil, Phone, Plus, Power } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm';
import { ActiveBadge, Button, Card, Empty, Field, Input, Loading, Modal, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { toastError } from '@/lib/errors';
import { cleanBody } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { hasRole, type Company, type Paginated } from '@/lib/types';

type Form = { nameAr: string; nameEn: string; addressAr: string; addressEn: string; phone: string; email: string; website: string };
const blank: Form = { nameAr: '', nameEn: '', addressAr: '', addressEn: '', phone: '', email: '', website: '' };

function Logo({ company, size = 'size-14' }: { company: Pick<Company, 'logo' | 'nameAr' | 'nameEn'>; size?: string }) {
  const { pick } = useI18n();
  return company.logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={`/uploads/${company.logo}`} alt="" className={`${size} shrink-0 rounded-2xl border border-stone/60 bg-white object-contain p-1`} />
    : <span className={`${size} grid shrink-0 place-items-center rounded-2xl bg-ink text-xl font-bold text-sand`}>{pick(company.nameAr, company.nameEn).charAt(0)}</span>;
}

function CompanyModal({ company, onClose }: { company: Company | 'new'; onClose: () => void }) {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const editing = company !== 'new';
  const file = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<Company | null>(editing ? company : null);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: editing ? { nameAr: company.nameAr, nameEn: company.nameEn ?? '', addressAr: company.addressAr ?? '', addressEn: company.addressEn ?? '', phone: company.phone ?? '', email: company.email ?? '', website: company.website ?? '' } : blank,
  });
  const done = () => { qc.invalidateQueries({ queryKey: ['companies'] }); qc.invalidateQueries({ queryKey: ['settings'] }); };
  const save = useMutation({
    mutationFn: (v: Form) => (editing ? api.patch<Company>(`/companies/${company.id}`, cleanBody(v, true)) : api.post<Company>('/companies', cleanBody(v, false))),
    onSuccess: () => { done(); toast.success(t('common.saved')); onClose(); },
    onError: (e) => toastError(e, t, has),
  });
  const upload = useMutation({
    mutationFn: (f: File) => { const fd = new FormData(); fd.append('file', f); return api.upload<Company>(`/companies/${current!.id}/logo`, fd); },
    onSuccess: (c) => { setCurrent(c); done(); toast.success(t('common.saved')); },
    onError: (e) => toastError(e, t, has),
  });
  return (
    <Modal open wide title={editing ? t('companies.edit') : t('companies.new')} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>{t('common.save')}</Button></>}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <div className="flex items-center gap-4 rounded-2xl bg-sand/50 p-3 sm:col-span-2">
          <Logo company={current ?? { logo: null, nameAr: '·', nameEn: null }} size="size-16" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{t('companies.logo')}</div>
            <div className="text-xs text-cocoa">{current ? t('companies.logoHint') : t('companies.saveFirst')}</div>
          </div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
          <Button variant="outline" size="sm" disabled={!current} loading={upload.isPending} onClick={() => file.current?.click()}><ImagePlus className="size-4" />{t('companies.uploadLogo')}</Button>
        </div>
        <Field label={t('companies.nameAr')} error={errors.nameAr?.message}><Input maxLength={190} {...register('nameAr', { required: t('common.required') })} /></Field>
        <Field label={t('companies.nameEn')}><Input dir="ltr" maxLength={190} {...register('nameEn')} /></Field>
        <Field label={t('companies.addressAr')}><Input {...register('addressAr')} /></Field>
        <Field label={t('companies.addressEn')}><Input dir="ltr" {...register('addressEn')} /></Field>
        <Field label={t('common.phone')}><Input dir="ltr" {...register('phone')} /></Field>
        <Field label={t('common.email')}><Input type="email" dir="ltr" {...register('email')} /></Field>
        <Field label={t('common.website')} className="sm:col-span-2"><Input dir="ltr" {...register('website')} /></Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function CompaniesPage() {
  const { t, pick, has } = useI18n();
  const me = useMe().data!;
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const allowed = hasRole(me.role, 'general_manager');
  const [edit, setEdit] = useState<Company | 'new' | null>(null);
  useEffect(() => { if (!allowed) router.replace('/dashboard'); }, [allowed, router]);
  const list = useQuery({ queryKey: ['companies'], enabled: allowed, queryFn: () => api.get<Paginated<Company>>('/companies', { status: 'all', limit: 100 }) });
  const toggle = useMutation({
    mutationFn: (c: Company) => api.patch(`/companies/${c.id}/active`, { isActive: !c.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e) => toastError(e, t, has),
  });
  async function onToggle(c: Company) {
    if (c.isActive && !(await confirm({ danger: true, title: t('common.deactivateTitle'), confirmText: t('common.deactivate'), message: t('common.deactivateMsg', { name: pick(c.nameAr, c.nameEn) }) }))) return;
    toggle.mutate(c);
  }
  if (!allowed) return null;

  return (
    <>
      <PageHeader title={t('companies.title')} actions={<Button onClick={() => setEdit('new')}><Plus className="size-4" />{t('companies.new')}</Button>} />
      {list.isLoading ? <Loading /> : !list.data?.data.length ? <Card><Empty /></Card> : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.data.data.map((c) => (
            <Card key={c.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <Logo company={c} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold">{pick(c.nameAr, c.nameEn)}</h2>
                  <p className="truncate text-sm text-cocoa" dir="ltr">{c.nameEn && c.nameAr ? pick(c.nameEn, c.nameAr) === c.nameEn ? c.nameEn : c.nameEn : ''}</p>
                </div>
                <ActiveBadge active={c.isActive} />
              </div>
              <div className="space-y-1 text-sm text-cocoa">
                {pick(c.addressAr, c.addressEn) && <p className="flex items-start gap-2"><Building2 className="mt-0.5 size-4 shrink-0 text-clay" />{pick(c.addressAr, c.addressEn)}</p>}
                {c.phone && <p className="flex items-center gap-2" dir="ltr"><Phone className="size-4 text-clay" />{c.phone}</p>}
                {c.email && <p className="flex items-center gap-2" dir="ltr"><Mail className="size-4 text-clay" />{c.email}</p>}
              </div>
              <div className="mt-auto flex gap-2">
                <Button size="sm" variant="soft" onClick={() => setEdit(c)}><Pencil className="size-4" />{t('common.edit')}</Button>
                <Button size="sm" variant="ghost" onClick={() => onToggle(c)}><Power className="size-4" />{c.isActive ? t('common.deactivate') : t('common.activate')}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {edit && <CompanyModal company={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
