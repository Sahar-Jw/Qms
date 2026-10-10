'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm';
import { MaterialThumb } from '@/components/MaterialThumb';
import { ActiveBadge, Button, Card, Empty, Field, Input, Loading, Modal, PageHeader, Pagination, Select, td, th, tr } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { toastError } from '@/lib/errors';
import { cleanBody, useDebounced } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { fmt, trimDec } from '@/lib/money';
import { hasRole, type Material, type Paginated } from '@/lib/types';

type Form = { materialCode: string; name: string; source: string; stockQuantity: string; unitPrice: string; unit: string; currency: string; countryOfOrigin: string; modelNumber: string; catalogueNumber: string };
const blank: Form = { materialCode: '', name: '', source: '', stockQuantity: '', unitPrice: '', unit: '', currency: '', countryOfOrigin: '', modelNumber: '', catalogueNumber: '' };
const toForm = (m: Material): Form => {
  const f = Object.fromEntries(Object.keys(blank).map((k) => [k, (m as unknown as Record<string, string | null>)[k] ?? ''])) as Form;
  return { ...f, stockQuantity: trimDec(m.stockQuantity), unitPrice: trimDec(m.unitPrice) };
};
const DEC = /^\d{1,14}(\.\d{1,4})?$/;

function MaterialModal({ material, onClose }: { material: Material | 'new'; onClose: () => void }) {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const editing = material !== 'new';
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImg, setRemoveImg] = useState(false);
  const current = editing && !removeImg ? material.catalogue ?? null : null;
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const pickFile = (f?: File) => {
    if (!f) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || f.size > 3 * 1024 * 1024) { toast.error(t('materials.imageHint')); return; }
    setFile(f); setRemoveImg(false);
  };
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: editing ? toForm(material) : blank });
  const save = useMutation({
    mutationFn: async (v: Form) => {
      const body = cleanBody(v, editing);
      if (body.currency) body.currency = String(body.currency).toUpperCase();
      // numbers can't be null on the backend: leave them out when empty
      for (const k of ['stockQuantity', 'unitPrice'] as const) if (body[k] === null) delete body[k];
      const saved = await (editing ? api.patch<Material>(`/materials/${material.id}`, body) : api.post<Material>('/materials', body));
      if (file) await api.upload<Material>(`/materials/${saved.id}/image`, (() => { const fd = new FormData(); fd.append('file', file); return fd; })());
      else if (editing && removeImg && material.catalogue) await api.delete(`/materials/${saved.id}/image`);
      return saved;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); qc.invalidateQueries({ queryKey: ['pick'] }); toast.success(t('common.saved')); onClose(); },
    onError: (e) => toastError(e, t, has),
  });
  const req = { required: t('common.required'), validate: (v: string) => v.trim() !== '' || t('common.required') };
  const dec = { required: t('common.required'), validate: (v: string) => DEC.test(v.trim()) || t('common.invalid') };
  return (
    <Modal open wide title={editing ? t('materials.edit') : t('materials.new')} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>{t('common.save')}</Button></>}>
      <form className="grid gap-4 sm:grid-cols-2 md:grid-cols-3" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <div className="flex items-center gap-4 rounded-2xl bg-sand/50 p-3 sm:col-span-2 md:col-span-3">
          <MaterialThumb image={preview ? null : current} size="size-20" className={preview ? 'hidden' : ''} />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-20 shrink-0 rounded-xl border border-stone/60 bg-white object-contain p-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{t('materials.image')}</div>
            <div className="text-xs text-cocoa">{file ? file.name : t('materials.imageHint')}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus className="size-4" />{file || current ? t('materials.changeImage') : t('materials.uploadImage')}</Button>
          {(file || current) && <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); setRemoveImg(true); }} aria-label={t('materials.removeImage')}><Trash2 className="size-4" /></Button>}
        </div>
        <Field label={t('materials.code')} required error={errors.materialCode?.message}><Input dir="ltr" maxLength={60} {...register('materialCode', req)} /></Field>
        <Field label={t('common.name')} required error={errors.name?.message} className="sm:col-span-2 md:col-span-2"><Input maxLength={255} {...register('name', req)} /></Field>
        <Field label={t('materials.unitPrice')} required error={errors.unitPrice?.message}><Input inputMode="decimal" dir="ltr" {...register('unitPrice', dec)} /></Field>
        <Field label={t('materials.currency')} required error={errors.currency?.message}><Input dir="ltr" maxLength={3} className="uppercase" {...register('currency', { required: t('common.required'), pattern: { value: /^[A-Za-z]{3}$/, message: t('common.invalid') } })} /></Field>
        <Field label={t('materials.unit')} required error={errors.unit?.message}><Input maxLength={30} {...register('unit', req)} /></Field>
        <Field label={t('materials.stock')} required error={errors.stockQuantity?.message}><Input inputMode="decimal" dir="ltr" {...register('stockQuantity', dec)} /></Field>
        <Field label={t('materials.source')} required error={errors.source?.message}><Input maxLength={150} {...register('source', req)} /></Field>
        <Field label={t('materials.origin')} required error={errors.countryOfOrigin?.message}><Input maxLength={100} {...register('countryOfOrigin', req)} /></Field>
        <Field label={t('materials.model')} required error={errors.modelNumber?.message}><Input dir="ltr" maxLength={100} {...register('modelNumber', req)} /></Field>
        <Field label={t('materials.catalogueNo')} required error={errors.catalogueNumber?.message}><Input dir="ltr" maxLength={100} {...register('catalogueNumber', req)} /></Field>
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
    if (m.isActive && !(await confirm({ danger: true, title: t('common.deactivateTitle'), confirmText: t('common.deactivate'), message: t('common.deactivateMsg', { name: m.name ?? '' }) }))) return;
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
              <thead><tr><th className={th}>{t('materials.image')}</th><th className={th}>{t('materials.code')}</th><th className={th}>{t('common.name')}</th><th className={th}>{t('materials.unitPrice')}</th><th className={th}>{t('materials.stock')}</th><th className={th}>{t('materials.source')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
              <tbody>
                {list.data.data.map((m) => (
                  <tr key={m.id} className={tr}>
                    <td className={td}><MaterialThumb image={m.catalogue} size="size-12" /></td>
                    <td className={`${td} font-bold`} dir="ltr">{m.materialCode}</td>
                    <td className={td}>{m.name ?? ''}</td>
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
