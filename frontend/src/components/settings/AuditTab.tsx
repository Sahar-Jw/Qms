'use client';
import { useQuery } from '@tanstack/react-query';
import { Eye, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Card, CardHeader, Empty, Input, Loading, Modal, Pagination, Select, td, th, tr } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useDebounced } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import type { AuditLogEntry, Paginated } from '@/lib/types';

const ACTIONS = ['create', 'update', 'delete', 'activate', 'deactivate', 'status_change', 'duplicate', 'login', 'login_failed', 'logout', 'register', 'change_password', 'forgot_password', 'reset_password', 'reset'];
const ENTITIES = ['quotations', 'customers', 'materials', 'companies', 'users', 'settings', 'theme', 'auth'];
const LIMIT = 20;

const when = (d: string) => new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' });

function actionStyle(a: string) {
  if (a === 'delete' || a === 'login_failed') return 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-800/30';
  if (a === 'create' || a === 'register') return 'bg-cocoa text-white';
  if (a === 'update' || a === 'status_change' || a === 'reset' || a === 'duplicate') return 'bg-stone text-ink';
  return 'bg-sand text-ink ring-1 ring-inset ring-stone';
}

/** Settings > Audit log (manager and above): who did what, and when. */
export function AuditTab() {
  const { t, has } = useI18n();
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AuditLogEntry | null>(null);
  const dq = useDebounced(q);
  useEffect(() => setPage(1), [dq, action, entity, from, to]);

  const list = useQuery({
    queryKey: ['audit-log', dq, action, entity, from, to, page],
    queryFn: () => api.get<Paginated<AuditLogEntry>>('/audit-log', { q: dq, action, entity, from, to, page, limit: LIMIT }),
    placeholderData: (p) => p,
  });

  const label = (group: 'actions' | 'entities', key: string) => (has(`audit.${group}.${key}`) ? t(`audit.${group}.${key}`) : key);
  const filtered = !!(q || action || entity || from || to);
  const clear = () => { setQ(''); setAction(''); setEntity(''); setFrom(''); setTo(''); };

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
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-cocoa">{t('common.from')}
                <Input type="date" dir="ltr" className="w-40" max={to || undefined} value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-cocoa">{t('common.to')}
                <Input type="date" dir="ltr" className="w-40" min={from || undefined} value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
            {filtered && <Button variant="ghost" size="sm" onClick={clear}>{t('common.clear')}</Button>}
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
                    <td className={cn(td, 'whitespace-nowrap tabular-nums')} dir="ltr">{when(r.createdAt)}</td>
                    <td className={td}>
                      {r.userName
                        ? <><div className="truncate font-bold"><bdi>{r.userName}</bdi></div>{r.userRole && <div className="text-xs text-cocoa">{t(`roles.${r.userRole}`)}</div>}</>
                        : <span className="text-cocoa">{t('audit.unknownUser')}</span>}
                    </td>
                    <td className={td}><span className={cn('inline-flex whitespace-nowrap rounded-full px-3 py-0.5 text-xs font-semibold', actionStyle(r.action))}>{label('actions', r.action)}</span></td>
                    <td className={td}>
                      <div className="font-semibold">{label('entities', r.entity)}</div>
                      {(r.entityLabel || r.entityId) && (
                        <div className="flex max-w-64 items-baseline gap-1.5 text-xs text-cocoa">
                          {r.entityLabel && <bdi className="truncate">{r.entityLabel}</bdi>}
                          {r.entityId && <span dir="ltr" className="shrink-0">#{r.entityId}</span>}
                        </div>
                      )}
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
              <dt className="font-semibold text-cocoa">{t('audit.when')}</dt><dd dir="ltr" className="text-start tabular-nums">{when(open.createdAt)}</dd>
              <dt className="font-semibold text-cocoa">{t('audit.user')}</dt><dd><bdi>{open.userName ?? t('audit.unknownUser')}</bdi>{open.userRole ? ` · ${t(`roles.${open.userRole}`)}` : ''}</dd>
              <dt className="font-semibold text-cocoa">{t('audit.record')}</dt>
              <dd>{open.entityLabel || open.entityId ? <>{open.entityLabel && <bdi>{open.entityLabel}</bdi>}{open.entityLabel && open.entityId ? ' · ' : ''}{open.entityId && <bdi dir="ltr">#{open.entityId}</bdi>}</> : '—'}</dd>
              <dt className="font-semibold text-cocoa">{t('audit.ip')}</dt><dd dir="ltr" className="text-start">{open.ip ?? '—'}</dd>
              <dt className="font-semibold text-cocoa">API</dt><dd dir="ltr" className="break-all text-start font-mono text-xs">{open.method} {open.path}</dd>
            </dl>
            <div>
              <div className="mb-1.5 text-xs font-bold text-cocoa">{t('audit.submitted')}</div>
              {open.details
                ? <pre dir="ltr" className="max-h-72 overflow-auto rounded-xl bg-sand/60 p-3 text-start font-mono text-xs leading-relaxed">{JSON.stringify(open.details, null, 2)}</pre>
                : <p className="text-cocoa">{t('audit.noDetails')}</p>}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
