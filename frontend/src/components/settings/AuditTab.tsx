'use client';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Download, Eye, Image as ImageIcon, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, Empty, Input, Loading, Modal, Pagination, Select, td, th, tr } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { api } from '@/lib/api';
import { toastError } from '@/lib/errors';
import { cn } from '@/lib/cn';
import { useDebounced } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { hasRole, type AuditLogEntry, type Paginated } from '@/lib/types';

const ACTIONS = ['create', 'update', 'delete', 'activate', 'deactivate', 'status_change', 'duplicate', 'login', 'login_failed', 'logout', 'register', 'change_password', 'forgot_password', 'reset_password', 'reset', 'denied', 'change_password_failed', 'reset_password_failed', 'print', 'export_pdf', 'email', 'view', 'export'];
const ENTITIES = ['quotations', 'customers', 'materials', 'companies', 'users', 'settings', 'theme', 'translations', 'auth', 'audit'];
const LIMIT = 20;

const when = (d: string, lang: string) => new Date(d).toLocaleString(lang === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'medium' });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
/** Technical names (quantityInStock, price_currency) become words; anything else (already readable) is left alone. */
const fieldName = (key: string) => (/^[A-Za-z0-9_-]+$/.test(key)
  ? key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : key);
/** Rows of a quotation edit are stored as items[2] / removedItems[1]: shown as "Item 2" / "Removed item 1". */
const ITEM_KEY = /^(items|removedItems)\[(\d+)\]$/;
/** Names a field ("validity" -> "مدة الصلاحية") and writes the value of a known list field (status, role, language) in the user's language. */
type Loc = { yes: string; no: string; label: (key: string) => string; enumText: (key: string | undefined, value: string) => string | null };
const valueText = (value: unknown, loc: Loc, key?: string): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? loc.yes : loc.no;
  // a list of records (the lines of a quotation) is one record per line, so long lists stay readable
  if (Array.isArray(value)) return value.some(isRecord)
    ? value.map((item, i) => `${i + 1}. ${valueText(item, loc)}`).join('\n') || '—'
    : value.map((item) => valueText(item, loc, key)).join(', ') || '—';
  if (isRecord(value)) {
    return Object.entries(value).map(([k, item]) => `${loc.label(k)}: ${valueText(item, loc, k)}`).join(' · ') || '—';
  }
  return typeof value === 'string' ? loc.enumText(key, value) ?? value : String(value);
};

/** Fields that hold an uploaded picture. */
const IMAGE_FIELDS = new Set(['avatar', 'logo', 'icon', 'headerImage', 'footerImage']);

function actionStyle(a: string) {
  if (a === 'delete' || a === 'login_failed' || a === 'denied' || a.endsWith('_failed')) return 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-800/30';
  if (a === 'create' || a === 'register') return 'bg-cocoa text-white';
  if (a === 'update' || a === 'status_change' || a === 'reset' || a === 'duplicate') return 'bg-stone text-ink';
  return 'bg-sand text-ink ring-1 ring-inset ring-stone';
}

/** Settings > Audit log (manager and above): who did what, and when. */
export function AuditTab() {
  const { t, has, lang } = useI18n();
  const me = useMe();
  const canExport = hasRole(me.data?.role, 'general_manager'); // the export and the integrity check are general manager and above
  const [busy, setBusy] = useState<'' | 'export' | 'verify'>('');
  const [userId, setUserId] = useState('');
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AuditLogEntry | null>(null);
  const [changeView, setChangeView] = useState<'sideBySide' | 'inline'>('sideBySide');
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, action, entity, userId, from, to]);
  const users = useQuery({ queryKey: ['audit-users'], queryFn: () => api.get<{ id: number; name: string }[]>('/audit-log/users'), staleTime: 60_000 });
  const hasChangeSet = !!open?.details && ('before' in open.details || 'after' in open.details);
  const beforeValues = hasChangeSet && isRecord(open?.details?.before) ? open.details.before : null;
  const afterValues = hasChangeSet
    ? (isRecord(open?.details?.after) ? open.details.after : null)
    : (isRecord(open?.details) ? open.details : null);
  const changedFields = Array.from(new Set([
    ...Object.keys(beforeValues ?? {}),
    ...Object.keys(afterValues ?? {}),
  ]));

  const list = useQuery({
    queryKey: ['audit-log', dq, action, entity, userId, from, to, page],
    queryFn: () => api.get<Paginated<AuditLogEntry>>('/audit-log', { q: dq, action, entity, userId, from, to, page, limit: LIMIT }),
    placeholderData: (p) => p,
  });

  const imageChange = (before: unknown, after: unknown) =>
    t(!after ? 'audit.imageRemoved' : before ? 'audit.imageReplaced' : 'audit.imageAdded');
  const label = (group: 'actions' | 'entities', key: string) => (has(`audit.${group}.${key}`) ? t(`audit.${group}.${key}`) : key);
  const fieldLabel = (key: string) => {
    const item = ITEM_KEY.exec(key);
    if (item) return t(item[1] === 'items' ? 'audit.item' : 'audit.removedItem', { n: item[2] });
    return has(`audit.fields.${key}`) ? t(`audit.fields.${key}`) : fieldName(key);
  };
  const loc: Loc = {
    yes: t('audit.trueValue'),
    no: t('audit.falseValue'),
    label: (key) => (has(`audit.fields.${key}`) ? t(`audit.fields.${key}`) : fieldName(key)),
    enumText: (key, value) => {
      if (key === 'status' && has(`status.${value}`)) return t(`status.${value}`);
      if (key === 'roleCode' && has(`roles.${value}`)) return t(`roles.${value}`);
      if (key === 'lang' && (value === 'ar' || value === 'en')) return value === 'ar' ? 'العربية' : 'English';
      return null;
    },
  };
  const val = (value: unknown, key?: string) => valueText(value, loc, key);
  /** One line under the record in the table: which fields an edit touched, so most rows need no click at all. */
  const summary = (details: AuditLogEntry['details']) => {
    const keys = ('before' in details || 'after' in details)
      ? Array.from(new Set([...Object.keys(isRecord(details.before) ? details.before : {}), ...Object.keys(isRecord(details.after) ? details.after : {})]))
      : Object.keys(details);
    if (!keys.length) return '';
    const shown = keys.slice(0, 3).map(fieldLabel).join(lang === 'ar' ? '، ' : ', ');
    return keys.length > 3 ? `${shown} … ${t('audit.more', { n: keys.length - 3 })}` : shown;
  };
  const filtered = !!(q || action || entity || userId || from || to);
  const clear = () => { setQ(''); setAction(''); setEntity(''); setUserId(''); setFrom(''); setTo(''); };

  /** Downloads the filtered log as CSV (up to 10,000 rows, newest first). */
  async function exportCsv() {
    setBusy('export');
    try {
      const blob = await api.download('/audit-log/export', { q: dq, action, entity, userId, from, to });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toastError(e, t, has);
    } finally {
      setBusy('');
    }
  }

  /** Asks the server to check every row against its signature (rows edited directly in the database fail). */
  async function verify() {
    setBusy('verify');
    try {
      const r = await api.get<{ configured: boolean; total: number; valid: number; unsigned: number; invalid: number; invalidIds: number[] }>('/audit-log/verify');
      if (!r.configured) toast.info(t('audit.verifyOff'));
      else if (r.invalid > 0) toast.error(t('audit.verifyBad', { n: r.invalid, ids: r.invalidIds.map((id) => `#${id}`).join(', ') }), { duration: 15000 });
      else toast.success(`${t('audit.verifyOk', { n: r.valid })}${r.unsigned ? ` ${t('audit.verifyUnsigned', { n: r.unsigned })}` : ''}`, { duration: 8000 });
    } catch (e) {
      toastError(e, t, has);
    } finally {
      setBusy('');
    }
  }

  return (
    <>
      <Card>
        <CardHeader title={t('audit.title')} />
        <div className="space-y-3 border-b border-stone/50 p-4">
          <p className="text-sm text-cocoa">{t('audit.sub')}</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-clay" />
              <Input className="ps-10" placeholder={t('audit.searchPh')} aria-label={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select wrapperClassName="w-44" aria-label={t('audit.action')} value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">{t('audit.allActions')}</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{label('actions', a)}</option>)}
            </Select>
            <Select wrapperClassName="w-44" aria-label={t('audit.record')} value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">{t('audit.allEntities')}</option>
              {ENTITIES.map((e) => <option key={e} value={e}>{label('entities', e)}</option>)}
            </Select>
            <Select wrapperClassName="w-44" aria-label={t('audit.user')} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">{t('audit.allUsers')}</option>
              {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-cocoa sm:flex-none">{t('common.from')}
                <Input type="date" dir="ltr" className="w-full min-w-0 sm:w-40" max={to || undefined} value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-cocoa sm:flex-none">{t('common.to')}
                <Input type="date" dir="ltr" className="w-full min-w-0 sm:w-40" min={from || undefined} value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
            {filtered && <Button variant="ghost" size="sm" onClick={clear}>{t('common.clear')}</Button>}
            {canExport && (
              <div className="ms-auto flex flex-wrap gap-2">
                <Button variant="soft" size="sm" onClick={exportCsv} disabled={busy !== ''}><Download className="size-4" />{t('audit.exportCsv')}</Button>
                <Button variant="soft" size="sm" onClick={verify} disabled={busy !== ''}><ShieldCheck className="size-4" />{t('audit.verify')}</Button>
              </div>
            )}
          </div>
        </div>

        {list.isLoading ? <Loading /> : !list.data?.data.length ? <Empty text={t('audit.none')} /> : (
          <div className={cn('overflow-x-auto transition-opacity', list.isFetching && 'opacity-60')}>
            <table className="w-full min-w-[820px]">
              <thead>
                <tr><th className={th}>{t('audit.when')}</th><th className={th}>{t('audit.user')}</th><th className={th}>{t('audit.action')}</th><th className={th}>{t('audit.record')}</th><th className={th} /></tr>
              </thead>
              <tbody>
                {list.data.data.map((r) => (
                  <tr key={r.id} className={tr}>
                    <td className={cn(td, 'whitespace-nowrap tabular-nums')} dir="ltr">{when(r.createdAt, lang)}</td>
                    <td className={td}>
                      {r.userName
                        ? <><div className="truncate font-bold"><bdi>{r.userName}</bdi></div>{r.userRole && <div className="text-xs text-cocoa">{t(`roles.${r.userRole}`)}</div>}</>
                        : <span className="text-cocoa">{t('audit.unknownUser')}</span>}
                    </td>
                    <td className={td}><span className={cn('inline-flex whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-semibold', actionStyle(r.action))}>{label('actions', r.action)}</span></td>
                    <td className={td}>
                      <div className="font-semibold">{label('entities', r.entity)}</div>
                      {r.entityLabel && (
                        <div className="flex max-w-64 items-baseline gap-1.5 text-xs text-cocoa">
                          <bdi className="truncate">{r.entityLabel}</bdi>
                        </div>
                      )}
                      {r.details && summary(r.details) && <div className="max-w-64 truncate text-xs text-clay" title={summary(r.details)}>{summary(r.details)}</div>}
                    </td>
                    <td className={cn(td, 'text-end')}>
                      <Button size="sm" variant="ghost" onClick={() => setOpen(r)} aria-label={`${t('audit.details')} #${r.id}`} title={t('audit.details')}><Eye className="size-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && list.data.total > 0 && <Pagination page={page} limit={LIMIT} total={list.data.total} onPage={setPage} />}
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${label('actions', open.action)} · ${label('entities', open.entity)}` : ''} footer={<Button variant="soft" onClick={() => setOpen(null)}>{t('common.close')}</Button>}>
        {open && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
              <dt className="font-semibold text-cocoa">{t('audit.when')}</dt><dd dir="ltr" className="text-start tabular-nums">{when(open.createdAt, lang)}</dd>
              <dt className="font-semibold text-cocoa">{t('audit.user')}</dt><dd><bdi>{open.userName ?? t('audit.unknownUser')}</bdi>{open.userRole ? ` · ${t(`roles.${open.userRole}`)}` : ''}</dd>
              <dt className="font-semibold text-cocoa">{t('audit.record')}</dt>
              <dd>{open.entityLabel ? <bdi>{open.entityLabel}</bdi> : '—'}</dd>
              <dt className="font-semibold text-cocoa">{t('audit.ip')}</dt><dd dir="ltr" className="text-start tabular-nums">{open.ip ?? '—'}</dd>
            </dl>
            {changedFields.length > 0 && <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-cocoa">{hasChangeSet ? t('audit.changes') : t('audit.submitted')}</div>
                {hasChangeSet && (
                  <div className="inline-flex rounded-full bg-sand/70 p-0.5" role="group" aria-label={t('audit.changes')}>
                    <Button size="sm" variant={changeView === 'sideBySide' ? 'soft' : 'ghost'} aria-pressed={changeView === 'sideBySide'} onClick={() => setChangeView('sideBySide')}>
                      {t('audit.sideBySide')}
                    </Button>
                    <Button size="sm" variant={changeView === 'inline' ? 'soft' : 'ghost'} aria-pressed={changeView === 'inline'} onClick={() => setChangeView('inline')}>
                      {t('audit.inline')}
                    </Button>
                  </div>
                )}
              </div>
              {changedFields.map((field) => (
                IMAGE_FIELDS.has(field) ? (
                  // Pictures are not shown (only their file name is stored): say which one changed and how.
                  <div key={field} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-sand/60 p-3">
                    <ImageIcon className="size-4 shrink-0 text-cocoa" aria-hidden="true" />
                    <span className="font-semibold">{t(`audit.assets.${field}`)}</span>
                    <span className="text-cocoa">·</span>
                    <span>{imageChange(beforeValues?.[field], afterValues?.[field])}</span>
                  </div>
                ) : !hasChangeSet ? (
                  // Created records and similar: there is no "before", so just the value.
                  <div key={field} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-sand/60 p-3">
                    <span className="text-xs font-semibold text-cocoa">{fieldLabel(field)}</span>
                    <span className="min-w-0 whitespace-pre-line break-words">{afterValues && field in afterValues
                      ? val(afterValues[field], field)
                      : '—'}</span>
                  </div>
                ) : changeView === 'sideBySide' ? (
                  <div key={field} className="grid gap-3 rounded-xl bg-sand/60 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <div className="mb-1 text-xs font-semibold text-cocoa">{fieldLabel(field)} · {t('audit.before')}</div>
                      <div className="whitespace-pre-line break-words">{beforeValues && field in beforeValues
                        ? val(beforeValues[field], field)
                        : '—'}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 text-xs font-semibold text-cocoa">{fieldLabel(field)} · {t('audit.after')}</div>
                      <div className="whitespace-pre-line break-words">{afterValues && field in afterValues
                        ? val(afterValues[field], field)
                        : '—'}</div>
                    </div>
                  </div>
                ) : (
                  <div key={field} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-sand/60 p-3">
                    <span className="w-full text-xs font-semibold text-cocoa">{fieldLabel(field)}</span>
                    <span className="min-w-0 whitespace-pre-line break-words">{beforeValues && field in beforeValues
                      ? val(beforeValues[field], field)
                      : '—'}</span>
                    <ArrowRight className="size-4 shrink-0 text-cocoa rtl:rotate-180" aria-hidden="true" />
                    <span className="min-w-0 whitespace-pre-line break-words font-semibold">{afterValues && field in afterValues
                      ? val(afterValues[field], field)
                      : '—'}</span>
                  </div>
                )
              ))}
            </div>}
            {changedFields.length === 0 && (
              // Never leave the modal blank: show whatever was stored, or say plainly that there is nothing more.
              Object.keys(open.details ?? {}).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(open.details).map(([key, value]) => (
                    <div key={key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-sand/60 p-3">
                      <span className="text-xs font-semibold text-cocoa">{fieldLabel(key)}</span>
                      <span className="min-w-0 whitespace-pre-line break-words" dir="auto">{val(value, key)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="rounded-xl bg-sand/60 p-3 text-cocoa">{t('audit.noDetails')}</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
