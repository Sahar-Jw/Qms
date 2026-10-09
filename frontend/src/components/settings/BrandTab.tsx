'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadUrl } from '@/lib/urls';
import { ImagePlus, Image as ImageIcon, Save, Sparkles, Trash2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, Field, Input, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useBrandSettings } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { toastError } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import type { BrandSettings } from '@/lib/types';

const empty: BrandSettings = { websiteName: 'Quotations', tagline: 'Prices, customers and materials in one place', logo: null, icon: null };

function assetUrl(value: string | null | undefined) {
  return value ? uploadUrl(value) : '';
}

const clampValue = (v: string) => v.replace(/\n/g, ' ').trim();

export function BrandTab() {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const brand = useBrandSettings();
  const [draft, setDraft] = useState<BrandSettings | null>(null);

  const form = draft ?? brand.data ?? empty;
  const changed = !!brand.data && (
    form.websiteName !== brand.data.websiteName ||
    form.tagline !== brand.data.tagline ||
    form.logo !== brand.data.logo ||
    form.icon !== brand.data.icon
  );

  const save = useMutation({
    mutationFn: (next: BrandSettings) => api.patch<BrandSettings>('/settings/brand', next),
    onSuccess: (saved) => {
      qc.setQueryData(['brand'], saved);
      setDraft(null);
      toast.success(t('brand.saved'));
    },
    onError: (e) => toastError(e, t, has),
  });

  const upload = useMutation({
    mutationFn: ({ kind, file }: { kind: 'logo' | 'icon'; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.upload<BrandSettings>(`/settings/brand/${kind}`, fd);
    },
    onSuccess: (saved, vars) => {
      qc.setQueryData(['brand'], saved);
      setDraft((prev) => ({ ...(prev ?? brand.data ?? empty), [vars.kind]: saved[vars.kind] }));
      toast.success(vars.kind === 'logo' ? t('brand.logoSaved') : t('brand.iconSaved'));
    },
    onError: (e) => toastError(e, t, has),
  });

  const removeAsset = useMutation({
    mutationFn: (kind: 'logo' | 'icon') => api.delete<BrandSettings>(`/settings/brand/${kind}`),
    onSuccess: (saved, kind) => {
      qc.setQueryData(['brand'], saved);
      setDraft((prev) => ({ ...(prev ?? brand.data ?? empty), [kind]: null }));
      toast.success(kind === 'logo' ? t('brand.logoRemoved') : t('brand.iconRemoved'));
    },
    onError: (e) => toastError(e, t, has),
  });

  const onFilePick = (kind: 'logo' | 'icon') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    upload.mutate({ kind, file });
    event.target.value = '';
  };

  if (brand.isLoading) return <Card><Loading /></Card>;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
      <Card className="min-w-0 lg:col-span-7">
        <CardHeader title={t('brand.title')} />
        <div className="space-y-5 p-4 sm:p-5">
          <p className="text-sm text-cocoa">{t('brand.sub')}</p>

          <Field label={t('brand.websiteName')}>
            <Input value={form.websiteName} onChange={(e) => setDraft({ ...form, websiteName: clampValue(e.target.value) || 'Quotations' })} />
          </Field>

          <Field label={t('brand.tagline')}>
            <Input value={form.tagline} onChange={(e) => setDraft({ ...form, tagline: e.target.value })} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
            <Field label={t('brand.logo')} hint={t('brand.logoHint')}>
              <div className="flex flex-col items-start gap-3 min-[400px]:flex-row min-[400px]:items-center">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-stone bg-sand">
                  {assetUrl(form.logo) ? <img src={assetUrl(form.logo)} alt="" className="size-full object-contain p-2" /> : <ImageIcon className="size-6 text-cocoa" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-sand px-3 py-2 text-xs font-bold text-cocoa ring-1 ring-stone">
                    <ImagePlus className="size-4" />{t('brand.upload')}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFilePick('logo')} />
                  </label>
                  {form.logo && (
                    <Button variant="ghost" size="sm" className="text-red-700" onClick={() => removeAsset.mutate('logo')} disabled={removeAsset.isPending}>
                      <Trash2 className="size-4" />{t('brand.remove')}
                    </Button>
                  )}
                </div>
              </div>
            </Field>

            <Field label={t('brand.icon')} hint={t('brand.iconHint')}>
              <div className="flex flex-col items-start gap-3 min-[400px]:flex-row min-[400px]:items-center">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-stone bg-sand">
                  {assetUrl(form.icon) ? <img src={assetUrl(form.icon)} alt="" className="size-full object-cover p-2" /> : <Sparkles className="size-6 text-cocoa" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-sand px-3 py-2 text-xs font-bold text-cocoa ring-1 ring-stone">
                    <ImagePlus className="size-4" />{t('brand.upload')}
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFilePick('icon')} />
                  </label>
                  {form.icon && (
                    <Button variant="ghost" size="sm" className="text-red-700" onClick={() => removeAsset.mutate('icon')} disabled={removeAsset.isPending}>
                      <Trash2 className="size-4" />{t('brand.remove')}
                    </Button>
                  )}
                </div>
              </div>
            </Field>
          </div>

          <div className="flex flex-col gap-2 border-t border-stone/60 pt-4 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center">
            <Button loading={save.isPending} disabled={!changed || save.isPending} onClick={() => save.mutate(form)}>
              <Save className="size-4" />{t('common.save')}
            </Button>
            <Button variant="ghost" disabled={!draft} onClick={() => setDraft(null)}>
              {t('theme.discard')}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="min-w-0 self-start lg:sticky lg:top-20 lg:col-span-5">
        <CardHeader title={t('brand.preview')} />
        <div className="p-4 sm:p-5">
          <div className="overflow-hidden rounded-2xl border border-stone bg-sand shadow-lift">
            <div className="flex items-center gap-3 bg-ink p-3 text-sand sm:p-4">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-sand text-ink">
                {assetUrl(form.icon) ? <img src={assetUrl(form.icon)} alt="" className="size-full object-cover" /> : <Sparkles className="size-5" />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-bold">{form.websiteName || t('app.name')}</div>
                <div className="truncate text-xs text-sand/80">{form.tagline || t('app.tagline')}</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-stone bg-sand">
                  {assetUrl(form.logo) ? <img src={assetUrl(form.logo)} alt="" className="size-full object-contain p-2" /> : <ImageIcon className="size-5 text-cocoa" />}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-cocoa">{t('settings.title')}</div>
                  <div className="truncate text-sm font-semibold text-ink">{form.websiteName || t('app.name')}</div>
                </div>
              </div>
              <button type="button" className={cn('shrink-0 rounded-full bg-cocoa px-3 py-2 text-xs font-bold text-white')}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
