'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { uploadUrl } from '@/lib/urls';
import { FilePlus2, FileText, ImagePlus, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm';
import { MaterialThumb } from '@/components/MaterialThumb';
import { ProgressBar } from '@/components/ProgressBar';
import { ActiveBadge, Button, Card, Empty, Field, Input, Loading, Modal, PageHeader, Pagination, Select, td, th, tr } from '@/components/ui';
import { api } from '@/lib/api';
import { useCatalogSettings, useMe } from '@/lib/auth';
import { toastError } from '@/lib/errors';
import { fmtSize, optimizeImage } from '@/lib/image';
import { cleanBody, useDebounced } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { isCurrency, normalizeCurrency } from '@/lib/currency';
import { normalizeLink } from '@/lib/link';
import { fmt, trimDec } from '@/lib/money';
import { hasRole, type Material, type Paginated } from '@/lib/types';

type Form = { materialCode: string; name: string; source: string; stockQuantity: string; unitPrice: string; unit: string; currency: string; sellingPrice: string; sellingCurrency: string; link: string; countryOfOrigin: string; modelNumber: string; catalogueNumber: string };
const blank: Form = { materialCode: '', name: '', source: '', stockQuantity: '', unitPrice: '', unit: '', currency: '', sellingPrice: '', sellingCurrency: '', link: '', countryOfOrigin: '', modelNumber: '', catalogueNumber: '' };
const toForm = (m: Material): Form => {
  const f = Object.fromEntries(Object.keys(blank).map((k) => [k, (m as unknown as Record<string, string | null>)[k] ?? ''])) as Form;
  return { ...f, stockQuantity: trimDec(m.stockQuantity), unitPrice: trimDec(m.unitPrice), sellingPrice: trimDec(m.sellingPrice) };
};
const DEC = /^\d{1,14}(\.\d{1,4})?$/;
const URL_RE = /^https?:\/\/[^\s<>"']+$/i;

function MaterialModal({ material, onClose }: { material: Material | 'new'; onClose: () => void }) {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const editing = material !== 'new';
  const fileRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLInputElement>(null);
  // Settings > Files: the size limit is read live, so a change shows here at once. It only applies to files added now.
  const catalogLimit = useCatalogSettings().data;
  const catalogMb = catalogLimit?.maxFileSizeMb ?? 10;
  const [file, setFile] = useState<File | null>(null);
  const [catalogFiles, setCatalogFiles] = useState(editing ? material.catalog ?? [] : []);
  const [catalogSelection, setCatalogSelection] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImg, setRemoveImg] = useState(false);
  const [origSize, setOrigSize] = useState<number | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<'saving' | 'uploadingImage' | 'uploadingCatalog'>('saving');
  const current = editing && !removeImg ? material.img ?? null : null;
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const pickFile = async (f?: File) => {
    if (!f) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type) || f.size > 8 * 1024 * 1024) { toast.error(t('materials.imageHint')); return; }
    setPreparing(true);
    try {
      const small = await optimizeImage(f); // same width x height, just lighter
      setFile(small); setOrigSize(f.size); setRemoveImg(false);
    } finally { setPreparing(false); }
  };
  const { register, handleSubmit, getValues, setValue, watch, formState: { errors } } = useForm<Form>({ defaultValues: editing ? toForm(material) : blank });
  const save = useMutation({
    mutationFn: async (v: Form) => {
      const body = cleanBody(v, editing);
      // symbols ($, €, ل.س ...) are stored as their 3-letter code
      for (const k of ['currency', 'sellingCurrency'] as const) if (body[k]) body[k] = normalizeCurrency(String(body[k]));
      // numbers can't be null on the backend: leave them out when empty
      for (const k of ['stockQuantity', 'unitPrice'] as const) if (body[k] === null) delete body[k];
      if (body.link) body.link = normalizeLink(String(body.link));
      if (!editing) for (const k of ['sellingPrice', 'sellingCurrency', 'link'] as const) if (body[k] === undefined) delete body[k];
      setPhase('saving'); setPct(4);
      const saved = await (editing ? api.patch<Material>(`/materials/${material.id}`, body) : api.post<Material>('/materials', body));
      setPct(10);
      let uploadFailed = false;
      if (file) {
        setPhase('uploadingImage');
        const fd = new FormData();
        fd.append('file', file);
        try {
          await api.uploadWithProgress<Material>(`/materials/${saved.id}/image`, fd, (fr) => setPct(10 + Math.round(fr * 35)));
          setFile(null);
        } catch (e) {
          // the material itself is already saved: keep it, tell the user, and let them retry the picture from Edit
          uploadFailed = true;
          toastError(e, t, has);
        }
      } else if (editing && removeImg && material.img) await api.delete(`/materials/${saved.id}/image`);
      if (catalogSelection.length) {
        setPhase('uploadingCatalog');
        const fd = new FormData();
        catalogSelection.forEach((catalogFile) => fd.append('files', catalogFile));
        try {
          const uploaded = await api.uploadWithProgress<Material>(`/materials/${saved.id}/catalog`, fd, (fr) => setPct(45 + Math.round(fr * 55)));
          setCatalogFiles(uploaded.catalog ?? []);
          setCatalogSelection([]);
        } catch (e) {
          uploadFailed = true;
          toastError(e, t, has);
        }
      }
      setPct(100);
      return { saved, uploadFailed, created: !editing };
    },
    onSuccess: ({ uploadFailed, created }) => {
      qc.invalidateQueries({ queryKey: ['materials'] });
      qc.invalidateQueries({ queryKey: ['pick'] });
      if (!uploadFailed) toast.success(t('common.saved'));
      if (!uploadFailed || created) onClose();
    },
    onError: (e) => toastError(e, t, has),
  });
  const req = { required: t('common.required'), validate: (v: string) => v.trim() !== '' || t('common.required') };
  const dec = { required: t('common.required'), validate: (v: string) => DEC.test(v.trim()) || t('common.invalid') };
  const pickCatalog = (files: File[]) => {
    if (catalogFiles.length + catalogSelection.length + files.length > 10) {
      toast.error(t('materials.catalogLimit'));
      return;
    }
    const bigFile = files.find((f) => f.size > catalogMb * 1024 * 1024);
    if (bigFile) {
      toast.error(t('materials.catalogTooBig', { name: bigFile.name, size: catalogMb }));
      return;
    }
    const accepted = files.every((f) =>
      ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(f.type),
    );
    if (!accepted) {
      toast.error(t('materials.catalogHint', { size: catalogMb }));
      return;
    }
    setCatalogSelection((currentSelection) => [...currentSelection, ...files]);
  };
  return (
    <Modal open wide title={editing ? t('materials.edit') : t('materials.new')} onClose={onClose}
      footer={<>
        {save.isPending && <div className="me-auto min-w-52 flex-1"><ProgressBar value={pct} label={t(phase === 'saving' ? 'materials.savingDetails' : phase === 'uploadingImage' ? 'materials.uploadingImage' : 'materials.uploadingCatalog')} /></div>}
        <Button variant="ghost" disabled={save.isPending} onClick={onClose}>{t('common.cancel')}</Button>
        <Button loading={save.isPending} disabled={preparing} onClick={handleSubmit((v) => save.mutate(v))}>{t('common.save')}</Button>
      </>}>
      <form className="grid gap-4 sm:grid-cols-2 md:grid-cols-3" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <div className="flex items-center gap-4 rounded-2xl bg-sand/50 p-3 sm:col-span-2 md:col-span-3">
          <MaterialThumb image={preview ? null : current} size="size-24" className={preview ? 'hidden' : ''} zoom />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-24 shrink-0 rounded-xl border border-stone/60 bg-white object-contain p-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{t('materials.image')}</div>
            <div className="text-xs text-cocoa">{preparing ? t('materials.optimizing') : file ? `${file.name} · ${origSize && origSize > file.size ? `${fmtSize(origSize)} → ${fmtSize(file.size)}` : fmtSize(file.size)}` : t('materials.imageHint')}</div>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ''; }} />
          <Button type="button" variant="outline" size="sm" loading={preparing} onClick={() => fileRef.current?.click()}><ImagePlus className="size-4" />{file || current ? t('materials.changeImage') : t('materials.uploadImage')}</Button>
          {(file || current) && <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); setRemoveImg(true); }} aria-label={t('materials.removeImage')}><Trash2 className="size-4" /></Button>}
        </div>
        <div className="rounded-2xl bg-sand/50 p-3 sm:col-span-2 md:col-span-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{t('materials.catalogFiles')}</div>
              <div className="text-xs text-cocoa">{t('materials.catalogHint', { size: catalogMb })}</div>
            </div>
            <input ref={catalogRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.docx" multiple hidden
              onChange={(e) => { pickCatalog(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
            <Button type="button" variant="outline" size="sm" disabled={catalogFiles.length + catalogSelection.length >= 10}
              onClick={() => catalogRef.current?.click()}>
              <FilePlus2 className="size-4" />{t('materials.addCatalogFiles')}
            </Button>
          </div>
          {!!catalogSelection.length && <p className="mb-2 text-xs text-cocoa">{catalogSelection.map((f) => f.name).join(', ')}</p>}
          <div className="space-y-1.5">
            {catalogFiles.map((catalogFile) => (
              <div key={catalogFile.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                <a className="min-w-0 flex-1 truncate underline" href={uploadUrl(catalogFile.path)} target="_blank" rel="noreferrer">{catalogFile.name}</a>
                <Button type="button" variant="ghost" size="sm" disabled={save.isPending} aria-label={t('materials.removeCatalogFile')}
                  onClick={async () => {
                    if (editing) {
                      try {
                        const updated = await api.delete<Material>(`/materials/${material.id}/catalog/${catalogFile.id}`);
                        setCatalogFiles(updated.catalog ?? []);
                        qc.invalidateQueries({ queryKey: ['materials'] });
                      } catch (error) { toastError(error, t, has); }
                    } else setCatalogFiles((currentFiles) => currentFiles.filter((item) => item.id !== catalogFile.id));
                  }}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <Field label={t('materials.code')} required error={errors.materialCode?.message}><Input dir="ltr" maxLength={60} {...register('materialCode', req)} /></Field>
        <Field label={t('common.name')} required error={errors.name?.message} className="sm:col-span-2 md:col-span-2"><Input maxLength={255} {...register('name', req)} /></Field>
        <Field label={t('materials.unitPrice')} required error={errors.unitPrice?.message}><Input inputMode="decimal" dir="ltr" {...register('unitPrice', dec)} /></Field>
        <Field label={t('materials.currency')} required hint={t('materials.currencyHint')} error={errors.currency?.message}><Input dir="ltr" list="currencies" maxLength={20} {...register('currency', { required: t('common.required'), validate: (v: string) => isCurrency(v) || t('common.invalid'), onBlur: () => setValue('currency', normalizeCurrency(getValues('currency'))) })} /></Field>
        <Field label={t('materials.sellingPrice')} error={errors.sellingPrice?.message}><Input inputMode="decimal" dir="ltr" {...register('sellingPrice', { validate: (v: string) => v.trim() === '' || DEC.test(v.trim()) || t('common.invalid') })} /></Field>
        <Field label={t('materials.sellingCurrency')} required={watch('sellingPrice').trim() !== ''} hint={t('materials.currencyHint')} error={errors.sellingCurrency?.message}><Input dir="ltr" list="currencies" maxLength={20} {...register('sellingCurrency', { validate: (v: string) => (v.trim() === '' ? getValues('sellingPrice').trim() === '' || t('common.required') : isCurrency(v) || t('common.invalid')), onBlur: () => { const v = getValues('sellingCurrency'); if (v.trim()) setValue('sellingCurrency', normalizeCurrency(v)); } })} /></Field>
        <Field label={t('materials.link')} hint={t('materials.linkHint')} error={errors.link?.message} className="sm:col-span-2 md:col-span-3"><Input inputMode="url" dir="ltr" maxLength={500} placeholder="https://drive.google.com/…" {...register('link', { validate: (v: string) => v.trim() === '' || URL_RE.test(normalizeLink(v)) || t('common.invalid'), onBlur: () => { const v = getValues('link'); if (v.trim()) setValue('link', normalizeLink(v)); } })} /></Field>
        <Field label={t('materials.unit')} required error={errors.unit?.message}><Input maxLength={30} {...register('unit', req)} /></Field>
        <Field label={t('materials.stock')} required error={errors.stockQuantity?.message}><Input inputMode="decimal" dir="ltr" {...register('stockQuantity', dec)} /></Field>
        <Field label={t('materials.source')} required error={errors.source?.message}><Input maxLength={150} {...register('source', req)} /></Field>
        <Field label={t('materials.origin')} required error={errors.countryOfOrigin?.message}><Input maxLength={100} {...register('countryOfOrigin', req)} /></Field>
        <Field label={t('materials.model')} required error={errors.modelNumber?.message}><Input dir="ltr" maxLength={100} {...register('modelNumber', req)} /></Field>
        <Field label={t('materials.catalogueNo')} required error={errors.catalogueNumber?.message}><Input dir="ltr" maxLength={100} {...register('catalogueNumber', req)} /></Field>
        <datalist id="currencies">{['USD', 'EUR', 'SYP', 'TRY', 'AED', 'SAR', 'GBP', 'JOD', 'EGP'].map((c) => <option key={c} value={c} />)}</datalist>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function MaterialDetails({ material: x, onClose, onEdit }: { material: Material; onClose: () => void; onEdit: () => void }) {
  const { t } = useI18n();
  const rows: [string, ReactNode][] = [
    [t('materials.code'), <span key="c" className="font-bold" dir="ltr">{x.materialCode}</span>],
    [t('common.name'), x.name || '—'],
    [t('materials.unitPrice'), <span key="p" className="tabular-nums" dir="ltr">{fmt(x.unitPrice)} {x.currency}</span>],
    [t('materials.sellingPrice'), x.sellingPrice ? <span key="sp" className="tabular-nums" dir="ltr">{fmt(x.sellingPrice)} {x.sellingCurrency}</span> : '—'],
    [t('materials.link'), x.link ? <a key="l" href={x.link} target="_blank" rel="noreferrer" className="underline" dir="ltr">{x.link}</a> : '—'],
    [t('materials.stock'), <span key="s" className="tabular-nums" dir="ltr">{fmt(x.stockQuantity, 3)} {x.unit}</span>],
    [t('materials.unit'), x.unit || '—'],
    [t('materials.source'), x.source || '—'],
    [t('materials.origin'), x.countryOfOrigin || '—'],
    [t('materials.model'), <span key="m" dir="ltr">{x.modelNumber || '—'}</span>],
    [t('materials.catalogueNo'), <span key="n" dir="ltr">{x.catalogueNumber || '—'}</span>],
    [t('materials.catalogFiles'), x.catalog?.length
      ? <ul key="catalog" className="space-y-1">{x.catalog.map((file) =>
        <li key={file.id}><a href={uploadUrl(file.path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
          <FileText className="size-3.5 shrink-0" />{file.name}
        </a></li>,
      )}</ul>
      : '—'],
    [t('common.status'), <ActiveBadge key="a" active={x.isActive} />],
  ];
  return (
    <Modal open wide title={<>{t('materials.details')}: <span dir="auto">{x.name ?? x.materialCode}</span></>} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.close')}</Button><Button onClick={onEdit}><Pencil className="size-4" />{t('common.edit')}</Button></>}>
      <div className="grid gap-5 md:grid-cols-[16rem_minmax(0,1fr)]">
        <div>
          <div className="grid h-64 place-items-center rounded-2xl bg-sand/50 p-2">
            <MaterialThumb image={x.img} size="h-full w-full" className="border-0 bg-transparent" zoom />
          </div>
          {x.img && <p className="mt-2 text-center text-xs text-cocoa">{t('materials.clickToZoom')}</p>}
        </div>
        <dl className="grid content-start gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="min-w-0 border-b border-stone/40 pb-2">
              <dt className="text-xs font-semibold text-cocoa">{k}</dt>
              <dd className="mt-0.5 break-words text-sm">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
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
  const [view, setView] = useState<Material | null>(null);
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
                  <tr key={m.id} className={`${tr} cursor-pointer`} tabIndex={0}
                    onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button')) setView(m); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setView(m); }}>
                    <td className={td}><MaterialThumb image={m.img} size="size-20" zoom /></td>
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
      {view && <MaterialDetails material={view} onClose={() => setView(null)} onEdit={() => { setEdit(view); setView(null); }} />}
      {edit && <MaterialModal material={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
