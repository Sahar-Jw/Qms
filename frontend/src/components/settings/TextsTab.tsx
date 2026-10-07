'use client';
import { useMutation } from '@tanstack/react-query';
import { Pencil, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, Empty, Field, Input, Modal, Pagination, Select, Textarea, td, th, tr } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { toastError } from '@/lib/errors';
import { useDebounced } from '@/lib/hooks';
import { DEFAULT_TEXTS, useI18n, type Lang } from '@/lib/i18n';
import { keyLabel, sectionLabel } from '@/lib/i18n/key-labels';

const LIMIT = 25;
const LANGS: Lang[] = ['ar', 'en'];
const KEYS = Object.keys({ ...DEFAULT_TEXTS.en, ...DEFAULT_TEXTS.ar }).sort();
const SECTIONS = Array.from(new Set(KEYS.map((k) => k.split('.')[0])));
const vars = (s: string) => Array.from(new Set(Array.from(s.matchAll(/\{(\w+)\}/g), (m) => m[0])));

/** Settings > Texts (manager and above): edit the built-in Arabic / English UI texts. */
export function TextsTab() {
  const { t, has, lang, overrides, setOverrides } = useI18n();
  const [q, setQ] = useState('');
  const [section, setSection] = useState('');
  const [editedOnly, setEditedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [form, setForm] = useState<Record<Lang, string>>({ ar: '', en: '' });
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, section, editedOnly]);

  const current = (key: string, lang: Lang) => overrides[key]?.[lang] || DEFAULT_TEXTS[lang][key] || '';

  const rows = useMemo(() => {
    const s = dq.trim().toLowerCase();
    return KEYS.filter((k) => {
      if (section && k.split('.')[0] !== section) return false;
      if (editedOnly && !overrides[k]) return false;
      if (!s) return true;
      return k.toLowerCase().includes(s) || LANGS.some((l) => keyLabel(k, l).toLowerCase().includes(s) || current(k, l).toLowerCase().includes(s));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, section, editedOnly, overrides]);
  const pageRows = rows.slice((page - 1) * LIMIT, page * LIMIT);

  const open = (key: string) => { setForm({ ar: current(key, 'ar'), en: current(key, 'en') }); setEditKey(key); };
  const close = () => setEditKey(null);

  // Placeholders like {name} are filled in by the app: the new text must keep them all.
  const missing = (lang: Lang) => {
    if (!editKey) return [];
    const need = vars(DEFAULT_TEXTS[lang][editKey] ?? DEFAULT_TEXTS.en[editKey] ?? '');
    return need.filter((v) => !form[lang].includes(v));
  };
  const blocked = LANGS.some((l) => !form[l].trim() || missing(l).length > 0);

  const apply = (key: string, ar: string | undefined, en: string | undefined) =>
    setOverrides((prev) => {
      const next = { ...prev };
      if (!ar && !en) delete next[key]; else next[key] = { ...(ar ? { ar } : {}), ...(en ? { en } : {}) };
      return next;
    });

  const save = useMutation({
    mutationFn: () => {
      // Only send a language when it differs from the built-in text.
      const ar = form.ar.trim() !== (DEFAULT_TEXTS.ar[editKey!] ?? '') ? form.ar.trim() : undefined;
      const en = form.en.trim() !== (DEFAULT_TEXTS.en[editKey!] ?? '') ? form.en.trim() : undefined;
      return api.put('/translations', { key: editKey, ar, en }).then(() => ({ ar, en }));
    },
    onSuccess: ({ ar, en }) => { apply(editKey!, ar, en); toast.success(t('texts.saved')); close(); },
    onError: (e) => toastError(e, t, has),
  });

  const reset = useMutation({
    mutationFn: () => api.delete(`/translations?key=${encodeURIComponent(editKey!)}`),
    onSuccess: () => { apply(editKey!, undefined, undefined); toast.success(t('texts.resetDone')); close(); },
    onError: (e) => toastError(e, t, has),
  });

  return (
    <>
      <Card>
        <CardHeader title={t('texts.title')} />
        <div className="space-y-3 border-b border-stone/50 p-4">
          <p className="text-sm text-cocoa">{t('texts.sub')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-clay" />
              <Input className="ps-10" placeholder={t('texts.searchPh')} aria-label={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select wrapperClassName="w-48" aria-label={t('texts.section')} value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">{t('texts.allSections')}</option>
              {SECTIONS.map((s) => <option key={s} value={s}>{sectionLabel(s, lang)}</option>)}
            </Select>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-cocoa">
              <input type="checkbox" className="size-4 accent-cocoa" checked={editedOnly} onChange={(e) => setEditedOnly(e.target.checked)} />
              {t('texts.editedOnly')}{Object.keys(overrides).length > 0 && ` (${Object.keys(overrides).length})`}
            </label>
          </div>
        </div>

        {!rows.length ? <Empty text={t('texts.none')} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr><th className={th}>{t('texts.key')}</th><th className={th}>{t('texts.arabic')}</th><th className={th}>{t('texts.english')}</th><th className={th} /></tr>
              </thead>
              <tbody>
                {pageRows.map((k) => (
                  <tr key={k} className={tr}>
                    <td className={cn(td, 'max-w-64 align-top')}>
                      <div className="font-semibold"><bdi>{keyLabel(k, lang)}</bdi></div>
                      <div dir="ltr" className="break-all text-start font-mono text-[11px] text-clay">{k}</div>
                      {overrides[k] && <span className="mt-1 inline-flex rounded-full bg-cocoa px-2 py-0.5 text-[11px] font-semibold text-white">{t('texts.edited')}</span>}
                    </td>
                    <td className={cn(td, 'max-w-72 align-top')} dir="rtl"><bdi>{current(k, 'ar')}</bdi></td>
                    <td className={cn(td, 'max-w-72 align-top')} dir="ltr"><bdi>{current(k, 'en')}</bdi></td>
                    <td className={cn(td, 'whitespace-nowrap text-end align-top')}>
                      <Button size="sm" variant="ghost" onClick={() => open(k)} aria-label={`${t('texts.edit')}: ${k}`} title={t('texts.edit')}><Pencil className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && <Pagination page={page} limit={LIMIT} total={rows.length} onPage={setPage} />}
      </Card>

      <Modal
        open={!!editKey} onClose={close} title={t('texts.edit')} wide
        footer={<>
          {editKey && overrides[editKey] && <Button variant="ghost" onClick={() => reset.mutate()} loading={reset.isPending} className="me-auto"><RotateCcw className="size-4" />{t('texts.reset')}</Button>}
          <Button variant="soft" onClick={close}>{t('common.cancel')}</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={blocked}>{t('common.save')}</Button>
        </>}
      >
        {editKey && (
          <div className="space-y-4">
            <div className="rounded-xl bg-sand/60 px-3 py-2">
              <div className="text-sm font-bold"><bdi>{keyLabel(editKey, lang)}</bdi></div>
              <div dir="ltr" className="break-all text-start font-mono text-[11px] text-clay">{editKey}</div>
            </div>
            {LANGS.map((l) => {
              const miss = missing(l);
              const need = vars(DEFAULT_TEXTS[l][editKey] ?? DEFAULT_TEXTS.en[editKey] ?? '');
              return (
                <Field key={l} label={t(l === 'ar' ? 'texts.arabic' : 'texts.english')} required
                  error={miss.length ? t('texts.missingVars', { vars: miss.join(' ') }) : undefined}
                  hint={need.length ? t('texts.keepVars', { vars: need.join(' ') }) : undefined}>
                  <Textarea dir={l === 'ar' ? 'rtl' : 'ltr'} rows={3} maxLength={2000} invalid={miss.length > 0 || !form[l].trim()} value={form[l]} onChange={(e) => setForm({ ...form, [l]: e.target.value })} />
                  <span className="mt-1 block text-xs text-clay">{t('texts.defaultText')}: <bdi dir={l === 'ar' ? 'rtl' : 'ltr'}>{DEFAULT_TEXTS[l][editKey] ?? '—'}</bdi></span>
                </Field>
              );
            })}
            <p className="text-xs text-cocoa">{t('texts.tip')}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
