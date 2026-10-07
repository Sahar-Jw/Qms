'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Receipt, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm';
import { Button, Card, CardHeader, Input, Loading, STATUS_STYLE } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { toastError } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { applyTheme, DEFAULT_THEME, isHex, readability, THEME_KEYS, themeVars, useTheme, type ThemeColors, type ThemeKey } from '@/lib/theme';
import type { QStatus } from '@/lib/types';

const same = (a: string, b: string) => a.toUpperCase() === b.toUpperCase();
/** "a1b2" -> "#A1B2": always a leading #, hex digits only, at most 6 of them. */
const clean = (v: string) => '#' + v.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();

/** Settings > Theme (manager and above): change the site colours, check them in a small card, then save. */
export function ThemeTab() {
  const { t, has } = useI18n();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const saved = useTheme();
  const [draft, setDraft] = useState<ThemeColors | null>(null);

  const base = saved.data?.colors;
  const form = draft ?? base; // what the inputs show

  const onDone = (msg: string) => (r: { colors: ThemeColors }) => {
    qc.setQueryData(['theme'], r);
    applyTheme(r.colors); // the real site changes now, for this user; everyone else on their next load
    setDraft(null);
    toast.success(msg);
  };
  const save = useMutation({
    mutationFn: (colors: ThemeColors) => api.patch<{ colors: ThemeColors }>('/settings/theme', { colors }),
    onSuccess: onDone(t('theme.saved')),
    onError: (e) => toastError(e, t, has),
  });
  const reset = useMutation({
    mutationFn: () => api.delete<{ colors: ThemeColors }>('/settings/theme'),
    onSuccess: onDone(t('theme.resetDone')),
    onError: (e) => toastError(e, t, has),
  });

  if (saved.isLoading) return <Card><Loading /></Card>;
  if (!base || !form) return <Card><p className="p-5 text-sm text-red-700">{t('err.NETWORK')}</p></Card>;

  const invalid = THEME_KEYS.some((k) => !isHex(form[k]));
  const changed = THEME_KEYS.some((k) => !same(form[k], base[k]));
  // The preview uses the last valid colour while a hex code is half-typed.
  const preview = Object.fromEntries(THEME_KEYS.map((k) => [k, isHex(form[k]) ? form[k] : base[k]])) as ThemeColors;
  const read = readability(preview);
  const isDefault = THEME_KEYS.every((k) => same(base[k], DEFAULT_THEME[k]));
  const set = (k: ThemeKey, v: string) => setDraft({ ...form, [k]: v });
  const busy = save.isPending || reset.isPending;

  async function onReset() {
    if (await confirm({ danger: true, title: t('theme.resetTitle'), message: t('theme.resetMsg'), confirmText: t('theme.resetConfirm') })) reset.mutate();
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-7">
        <CardHeader title={t('theme.title')} />
        <div className="space-y-5 p-5">
          <p className="text-sm text-cocoa">{t('theme.sub')} {t('theme.everyone')}</p>

          <div className="space-y-3">
            {THEME_KEYS.map((k) => {
              const label = t(`theme.colors.${k}`);
              return (
                <div key={k} className="flex items-center gap-3">
                  <input type="color" aria-label={label} value={(isHex(form[k]) ? form[k] : base[k]).toLowerCase()} onChange={(e) => set(k, e.target.value.toUpperCase())}
                    className="size-11 shrink-0 cursor-pointer rounded-xl border border-stone bg-white p-1" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-sm font-bold">{label}</div>
                    <div className="truncate text-xs text-cocoa">{t(`theme.usedFor.${k}`)}</div>
                  </div>
                  <div className="w-32 shrink-0">
                    <Input dir="ltr" maxLength={7} spellCheck={false} autoComplete="off" value={form[k]} invalid={!isHex(form[k])} aria-label={`${label} - ${t('theme.hex')}`}
                      onChange={(e) => set(k, clean(e.target.value))} className="font-mono uppercase" />
                  </div>
                </div>
              );
            })}
          </div>

          {invalid && <p role="alert" className="text-xs font-medium text-red-700">{t('theme.invalidHex')}</p>}
          {!invalid && read.level !== 'good' && (
            <div role="alert" className={cn('flex items-start gap-2 rounded-xl border p-3 text-xs font-medium', read.level === 'unreadable' ? 'border-red-800/40 bg-red-50 text-red-800' : 'border-stone bg-sand/60 text-ink')}>
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {read.level === 'unreadable' ? t('theme.unreadable') : t('theme.weak')}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-stone/50 pt-4">
            <Button loading={save.isPending} disabled={busy || !changed || invalid || read.level === 'unreadable'} onClick={() => save.mutate(preview)}>{t('common.save')}</Button>
            <Button variant="ghost" disabled={busy || !draft} onClick={() => setDraft(null)}>{t('theme.discard')}</Button>
            <Button variant="outline" className="ms-auto" loading={reset.isPending} disabled={busy || isDefault} onClick={onReset}><RotateCcw className="size-4" />{t('theme.reset')}</Button>
          </div>
          {changed && <p className="text-xs font-semibold text-cocoa">{t('theme.unsaved')}</p>}
        </div>
      </Card>

      <Card className="self-start lg:sticky lg:top-20 lg:col-span-5">
        <CardHeader title={t('theme.preview')} />
        <div className="p-5">
          <Preview colors={preview} />
        </div>
      </Card>
    </div>
  );
}

/**
 * A miniature of the real interface. The five colour tokens are overridden on this one element, so every
 * Tailwind class inside (bg-ink, text-cocoa, border-stone ...) follows the unsaved choices and nothing else on the page does.
 */
function Preview({ colors }: { colors: ThemeColors }) {
  const { t } = useI18n();
  const badge = (s: QStatus) => <span key={s} className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold', STATUS_STYLE[s].badge)}>{t(`status.${s}`)}</span>;
  return (
    <div data-testid="theme-preview" style={themeVars(colors)} aria-hidden className="pointer-events-none flex h-72 select-none overflow-hidden rounded-2xl border border-stone bg-sand text-ink shadow-lift">
      <div className="flex w-[34%] shrink-0 flex-col gap-1.5 bg-ink p-3 text-sand">
        <div className="mb-2 flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sand text-ink"><Receipt className="size-3.5" /></span>
          <span className="truncate text-xs font-bold">{t('app.name')}</span>
        </div>
        <span className="flex h-7 items-center truncate rounded-full bg-sand px-3 text-[11px] font-semibold text-ink">{t('nav.dashboard')}</span>
        <span className="flex h-7 items-center truncate rounded-full px-3 text-[11px] font-semibold text-sand/85">{t('nav.quotations')}</span>
        <span className="flex h-7 items-center truncate rounded-full px-3 text-[11px] font-semibold text-sand/85">{t('nav.customers')}</span>
        <span className="mt-auto flex h-7 items-center gap-2 truncate rounded-xl bg-cocoa/45 px-2 text-[10px] text-stone">
          <span className="size-4 shrink-0 rounded-full bg-clay" />{t('roles.manager')}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
        <div className="leading-tight">
          <div className="truncate text-sm font-bold text-ink">{t('nav.quotations')}</div>
          <div className="truncate text-[11px] text-cocoa">{t('app.tagline')}</div>
        </div>
        <div className="rounded-xl border border-stone/60 bg-white/90 p-2.5 shadow-lift">
          <div className="mb-2 flex flex-wrap gap-1">{(['draft', 'issued', 'expired', 'locked', 'invoiced'] as QStatus[]).map(badge)}</div>
          <div className="h-7 truncate rounded-lg border border-stone bg-white px-2.5 text-[11px] leading-7 text-clay">{t('nav.search')}</div>
        </div>
        <div className="mt-auto flex gap-2">
          <span className="inline-flex h-8 items-center rounded-full bg-cocoa px-4 text-xs font-semibold text-white">{t('common.save')}</span>
          <span className="inline-flex h-8 items-center rounded-full border border-clay px-4 text-xs font-semibold text-cocoa">{t('common.cancel')}</span>
        </div>
      </div>
    </div>
  );
}
