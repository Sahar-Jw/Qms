'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Info, Save } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, Field, Input, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { CATALOG_SETTINGS_KEY, useCatalogSettings } from '@/lib/auth';
import { toastError } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import type { CatalogSettings } from '@/lib/types';

// Same range the server accepts (backend/src/settings/catalog-limits.ts).
const MIN_MB = 1;
const MAX_MB = 50;

/** Settings > Files (manager and above): the largest size of one catalog file. It only decides about files added from now on. */
export function FilesTab() {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const saved = useCatalogSettings();
  const [draft, setDraft] = useState<string | null>(null);

  const current = saved.data?.maxFileSizeMb;
  const text = draft ?? (current !== undefined ? String(current) : '');
  const value = /^\d+$/.test(text) ? Number(text) : NaN;
  const valid = Number.isInteger(value) && value >= MIN_MB && value <= MAX_MB;
  const changed = valid && value !== current;
  const range = { min: MIN_MB, max: MAX_MB };

  const save = useMutation({
    mutationFn: (maxFileSizeMb: number) => api.patch<CatalogSettings>('/settings/catalog', { maxFileSizeMb }),
    onSuccess: (next) => {
      qc.setQueryData(CATALOG_SETTINGS_KEY, next); // the materials form and every other screen show the new size right away
      setDraft(null);
      toast.success(t('files.saved', { size: next.maxFileSizeMb }));
    },
    onError: (e) => toastError(e, t, has),
  });

  if (saved.isLoading) return <Card><Loading /></Card>;
  if (current === undefined) return <Card><p className="p-5 text-sm text-red-700">{t('err.NETWORK')}</p></Card>;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
      <Card className="min-w-0 lg:col-span-7">
        <CardHeader title={t('files.title')} />
        <form className="space-y-5 p-4 sm:p-5" onSubmit={(e) => { e.preventDefault(); if (changed) save.mutate(value); }}>
          <p className="text-sm text-cocoa">{t('files.sub')}</p>

          <Field label={t('files.maxSize')} hint={t('files.range', range)} error={text !== '' && !valid ? t('files.invalid', range) : undefined}>
            <Input type="number" inputMode="numeric" dir="ltr" min={MIN_MB} max={MAX_MB} step={1} className="max-w-40" value={text} invalid={text !== '' && !valid}
              onChange={(e) => setDraft(e.target.value)} />
          </Field>

          <p className="text-xs font-semibold text-ink">{t('files.current', { size: current })}</p>

          <div className="flex items-start gap-2 rounded-xl border border-stone bg-sand/60 p-3 text-xs text-ink">
            <Info className="mt-0.5 size-4 shrink-0 text-cocoa" />
            <div className="space-y-1">
              <p>{t('files.applies')}</p>
              <p>{t('files.slow')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-stone/60 pt-4 min-[420px]:flex-row min-[420px]:flex-wrap min-[420px]:items-center">
            <Button type="submit" loading={save.isPending} disabled={!changed || save.isPending}>
              <Save className="size-4" />{t('common.save')}
            </Button>
            <Button type="button" variant="ghost" disabled={draft === null || save.isPending} onClick={() => setDraft(null)}>
              {t('theme.discard')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
