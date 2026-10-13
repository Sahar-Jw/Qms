'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadUrl } from '@/lib/urls';
import { Building2, ImagePlus, Mail, Pencil, Phone, Plus, Power, Trash2 } from 'lucide-react';
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

type Slot = 'logo' | 'header' | 'footer';
const SLOT_PATH: Record<Slot, string> = { logo: 'logo', header: 'header-image', footer: 'footer-image' };
const SLOT_MAX: Record<Slot, number> = { logo: 1024 * 1024, header: 3 * 1024 * 1024, footer: 3 * 1024 * 1024 };
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type Form = { name: string; address: string; phone: string; email: string; website: string; taxEnabled: boolean; taxPercentage: string };
const blank: Form = { name: '', address: '', phone: '', email: '', website: '', taxEnabled: false, taxPercentage: '' };

function Logo({ company, size = 'size-14' }: { company: Pick<Company, 'logo' | 'name'>; size?: string }) {
  const { pick } = useI18n();
  return company.logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={uploadUrl(company.logo)} alt="" className={`${size} shrink-0 rounded-2xl border border-stone/60 bg-white object-contain p-1`} />
    : <span className={`${size} grid shrink-0 place-items-center rounded-2xl bg-ink text-xl font-bold text-sand`}>{company.name.charAt(0)}</span>;
}

function CompanyModal({ company, onClose }: { company: Company | 'new'; onClose: () => void }) {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const editing = company !== 'new';
  const reqText = { required: t('common.required'), validate: (v: string) => v.trim() !== '' || t('common.required') };
  const file = useRef<HTMLInputElement>(null);
  const headerFile = useRef<HTMLInputElement>(null);
  const footerFile = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<Company | null>(editing ? company : null);
  // Images picked before the company exists: kept here and uploaded right after the first save.
  const [pending, setPending] = useState<Partial<Record<Slot, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<Slot, string>>>({});
  const previewsRef = useRef(previews);
  previewsRef.current = previews;
  useEffect(() => () => { Object.values(previewsRef.current).forEach((u) => u && URL.revokeObjectURL(u)); }, []);
  const setPreview = (slot: Slot, f: File | null) => setPreviews((p) => {
    if (p[slot]) URL.revokeObjectURL(p[slot]!);
    return { ...p, [slot]: f ? URL.createObjectURL(f) : undefined };
  });
  const uploadTo = (id: number, slot: Slot, f: File) => { const fd = new FormData(); fd.append('file', f); return api.upload<Company>(`/companies/${id}/${SLOT_PATH[slot]}`, fd); };
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    defaultValues: editing ? {
      name: company.name, address: company.address ?? '', phone: company.phone ?? '', email: company.email ?? '', website: company.website ?? '',
      taxEnabled: company.taxEnabled, taxPercentage: company.taxPercentage ?? '',
    } : blank,
  });
  const taxEnabled = watch('taxEnabled');
  const done = () => { qc.invalidateQueries({ queryKey: ['companies'] }); qc.invalidateQueries({ queryKey: ['settings'] }); };
  const save = useMutation({
    mutationFn: async (v: Form) => {
      const { taxEnabled: enabled, taxPercentage, ...details } = v;
      const body = { ...cleanBody(details, !!current), taxEnabled: enabled, taxPercentage: enabled ? taxPercentage.trim() : null };
      if (current) return { company: await api.patch<Company>(`/companies/${current.id}`, body), failed: [] as Slot[] };
      const created = await api.post<Company>('/companies', body);
      // The images chosen while filling the form go up now that the company has an id.
      const failed: Slot[] = [];
      let latest = created;
      for (const slot of Object.keys(pending) as Slot[]) {
        try { latest = await uploadTo(created.id, slot, pending[slot]!); } catch { failed.push(slot); }
      }
      return { company: latest, failed };
    },
    onSuccess: ({ company: saved, failed }) => {
      done();
      if (failed.length) {
        // The company exists now: stay open on it so the failed images can be uploaded again.
        setCurrent(saved);
        setPending({});
        setPreviews((p) => { Object.values(p).forEach((u) => u && URL.revokeObjectURL(u)); return {}; });
        toast.error(t('companies.imagesFailed'));
        return;
      }
      toast.success(t('common.saved'));
      onClose();
    },
    onError: (e) => toastError(e, t, has),
  });
  const upload = useMutation({
    mutationFn: (f: File) => uploadTo(current!.id, 'logo', f),
    onSuccess: (c) => { setCurrent(c); done(); toast.success(t('common.saved')); },
    onError: (e) => toastError(e, t, has),
  });
  const uploadImage = useMutation({
    mutationFn: ({ kind, f }: { kind: 'header' | 'footer'; f: File }) => uploadTo(current!.id, kind, f),
    onSuccess: (c) => { setCurrent(c); done(); toast.success(t('common.saved')); },
    onError: (e) => toastError(e, t, has),
  });
  /** One entry point for every picture: saved straight away on an existing company, held until the first save otherwise. */
  function pick(slot: Slot, f: File | undefined) {
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) return void toast.error(t('err.INVALID_FILE_TYPE'));
    if (f.size > SLOT_MAX[slot]) return void toast.error(t('companies.imageTooBig', { mb: String(SLOT_MAX[slot] / 1024 / 1024) }));
    if (current) return slot === 'logo' ? upload.mutate(f) : uploadImage.mutate({ kind: slot, f });
    setPending((p) => ({ ...p, [slot]: f }));
    setPreview(slot, f);
  }
  function dropPending(slot: Slot) {
    setPending((p) => { const { [slot]: _gone, ...rest } = p; return rest; });
    setPreview(slot, null);
  }
  const removeImage = useMutation({
    mutationFn: (kind: 'header' | 'footer') => api.delete<Company>(`/companies/${current!.id}/${kind}-image`),
    onSuccess: (c) => { setCurrent(c); done(); toast.success(t('common.saved')); },
    onError: (e) => toastError(e, t, has),
  });
  return (
    <Modal open wide title={current ? t('companies.edit') : t('companies.new')} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>{t('common.save')}</Button></>}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <div className="flex items-center gap-4 rounded-2xl bg-sand/50 p-3 sm:col-span-2">
          {previews.logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={previews.logo} alt="" className="size-16 shrink-0 rounded-2xl border border-stone/60 bg-white object-contain p-1" />
            : <Logo company={current ?? { logo: null, name: '·' }} size="size-16" />}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{t('companies.logo')}</div>
            <div className="text-xs text-cocoa">{t('companies.logoHint')}</div>
          </div>
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { pick('logo', e.target.files?.[0]); e.target.value = ''; }} />
          <Button variant="outline" size="sm" loading={upload.isPending} onClick={() => file.current?.click()}><ImagePlus className="size-4" />{t('companies.uploadLogo')}</Button>
          {previews.logo && <Button variant="ghost" size="sm" onClick={() => dropPending('logo')}><Trash2 className="size-4" />{t('companies.removeImage')}</Button>}
        </div>
        <Field label={t('common.name')} required error={errors.name?.message}><Input maxLength={190} {...register('name', reqText)} /></Field>
        <Field label={t('common.address')} required error={errors.address?.message}><Input maxLength={255} {...register('address', reqText)} /></Field>
        <Field label={t('common.phone')} required error={errors.phone?.message}><Input dir="ltr" maxLength={60} {...register('phone', reqText)} /></Field>
        <Field label={t('common.email')} required error={errors.email?.message}><Input type="email" dir="ltr" maxLength={150} {...register('email', reqText)} /></Field>
        <Field label={t('common.website')} className="sm:col-span-2"><Input dir="ltr" {...register('website')} /></Field>
        <div className="rounded-2xl bg-sand/50 p-3 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" className="size-4 accent-cocoa" {...register('taxEnabled')} />
            {t('companies.taxEnabled')}
          </label>
          <p className="mt-1 text-xs text-cocoa">{t('companies.taxHint')}</p>
          {taxEnabled && <Field label={t('companies.taxPercentage')} required className="mt-3 max-w-xs" error={errors.taxPercentage?.message}>
            <Input inputMode="decimal" dir="ltr" placeholder="0" aria-invalid={!!errors.taxPercentage} {...register('taxPercentage', {
              validate: (value) => {
                if (!watch('taxEnabled')) return true;
                if (!value.trim()) return t('common.required');
                return /^(?:100(?:\.0{1,4})?|(?:\d{1,2})(?:\.\d{1,4})?)$/.test(value.trim()) || t('err.INVALID_PERCENTAGE');
              },
            })} />
          </Field>}
        </div>
        <div className="sm:col-span-2">
          <div className="text-sm font-bold">{t('companies.printTitle')}</div>
          <div className="text-xs text-cocoa">{t('companies.printHint')}</div>
        </div>
        {(['header', 'footer'] as const).map((kind) => {
          const file = kind === 'header' ? current?.headerImage : current?.footerImage;
          const shown = previews[kind] ?? (file ? uploadUrl(file) : null);
          return (
            <div key={kind} className="rounded-2xl bg-sand/50 p-3 sm:col-span-2">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1 text-sm font-bold">{t(`companies.${kind}Image`)}</div>
                <input ref={kind === 'header' ? headerFile : footerFile} type="file" accept="image/png,image/jpeg,image/webp" hidden
                  onChange={(e) => { pick(kind, e.target.files?.[0]); e.target.value = ''; }} />
                <Button variant="outline" size="sm" loading={uploadImage.isPending && uploadImage.variables?.kind === kind}
                  onClick={() => (kind === 'header' ? headerFile : footerFile).current?.click()}>
                  <ImagePlus className="size-4" />{shown ? t('companies.replaceImage') : t('companies.uploadImage')}
                </Button>
                {previews[kind]
                  ? <Button variant="ghost" size="sm" onClick={() => dropPending(kind)}><Trash2 className="size-4" />{t('companies.removeImage')}</Button>
                  : file && <Button variant="ghost" size="sm" loading={removeImage.isPending && removeImage.variables === kind} onClick={() => removeImage.mutate(kind)}><Trash2 className="size-4" />{t('companies.removeImage')}</Button>}
              </div>
              {shown
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={shown} alt="" className="max-h-28 w-full rounded-xl border border-stone/60 bg-white object-contain" />
                : <div className="grid h-16 place-items-center rounded-xl border border-dashed border-stone/70 text-xs text-cocoa">{t('companies.noImage')}</div>}
            </div>
          );
        })}
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
  const allowed = hasRole(me.role, 'manager');
  const [edit, setEdit] = useState<Company | 'new' | null>(null);
  useEffect(() => { if (!allowed) router.replace('/dashboard'); }, [allowed, router]);
  const list = useQuery({ queryKey: ['companies'], enabled: allowed, queryFn: () => api.get<Paginated<Company>>('/companies', { status: 'all', limit: 100 }) });
  const toggle = useMutation({
    mutationFn: (c: Company) => api.patch(`/companies/${c.id}/active`, { isActive: !c.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e) => toastError(e, t, has),
  });
  async function onToggle(c: Company) {
    if (c.isActive && !(await confirm({ danger: true, title: t('common.deactivateTitle'), confirmText: t('common.deactivate'), message: t('common.deactivateMsg', { name: c.name }) }))) return;
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
                  <h2 className="truncate text-lg font-bold">{c.name}</h2>
                </div>
                <ActiveBadge active={c.isActive} />
              </div>
              <div className="space-y-1 text-sm text-cocoa">
                {c.address && <p className="flex items-start gap-2"><Building2 className="mt-0.5 size-4 shrink-0 text-clay" />{c.address}</p>}
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
