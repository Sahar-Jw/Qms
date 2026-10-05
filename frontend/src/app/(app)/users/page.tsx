'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Power, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/confirm';
import { ActiveBadge, Button, Card, Empty, Input, Loading, PageHeader, Pagination, Select, td, th, tr } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { toastError } from '@/lib/errors';
import { useDebounced } from '@/lib/hooks';
import { useI18n } from '@/lib/i18n';
import { hasRole, isTopTier, type Paginated, type RoleCode, type User } from '@/lib/types';

type Tab = 'all' | 'pending' | 'active' | 'inactive';

export default function UsersPage() {
  const { t, has } = useI18n();
  const me = useMe().data!;
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const allowed = hasRole(me.role, 'general_manager');
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  useEffect(() => { if (!allowed) router.replace('/dashboard'); }, [allowed, router]);
  useEffect(() => setPage(1), [dq, tab]);

  const list = useQuery({ queryKey: ['users', tab, dq, page], enabled: allowed, queryFn: () => api.get<Paginated<User>>('/users', { q: dq, status: tab, page, limit: 15 }), placeholderData: (p) => p });
  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });
  const setActive = useMutation({
    mutationFn: ({ u, active }: { u: User; active: boolean }) => api.patch(`/users/${u.id}/${active ? 'activate' : 'deactivate'}`),
    onSuccess: () => { refresh(); toast.success(t('common.updated')); }, onError: (e) => toastError(e, t, has),
  });
  const setRole = useMutation({
    mutationFn: ({ u, roleCode }: { u: User; roleCode: RoleCode }) => api.patch(`/users/${u.id}`, { roleCode }),
    onSuccess: () => { refresh(); toast.success(t('common.updated')); }, onError: (e) => toastError(e, t, has),
  });
  async function onDeactivate(u: User) {
    if (await confirm({ danger: true, title: t('common.deactivateTitle'), confirmText: t('common.deactivate'), message: t('common.deactivateUserMsg', { name: u.fullName }) })) setActive.mutate({ u, active: false });
  }
  if (!allowed) return null;

  const roles: RoleCode[] = ['technical_manager', 'general_manager', 'manager', 'employee'];
  const tabs: [Tab, string][] = [['all', t('common.all')], ['pending', t('users.pending')], ['active', t('common.active')], ['inactive', t('common.inactive')]];

  return (
    <>
      <PageHeader title={t('users.title')} sub={list.data ? `${list.data.total} ${t('common.results')}` : undefined} />
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-60 flex-1"><Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-clay" /><Input className="ps-10" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="flex flex-wrap gap-2">
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={cn('rounded-full px-4 py-1.5 text-xs font-bold ring-1 ring-inset ring-stone', tab === k ? 'bg-ink text-sand ring-ink' : 'bg-white text-cocoa hover:bg-sand')}>{label}</button>
          ))}
        </div>
      </Card>
      <Card>
        {list.isLoading ? <Loading /> : !list.data?.data.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead><tr><th className={th}>{t('common.name')}</th><th className={th}>{t('common.phone')}</th><th className={th}>{t('common.role')}</th><th className={th}>{t('common.lastLogin')}</th><th className={th}>{t('common.status')}</th><th className={th} /></tr></thead>
              <tbody>
                {list.data.data.map((u) => {
                  const self = u.id === me.id;
                  const protectedRow = isTopTier(u.role); // technical / general managers cannot be changed by each other
                  const locked = self || protectedRow;
                  return (
                    <tr key={u.id} className={tr}>
                      <td className={td}>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-clay text-sm font-bold text-ink">{u.fullName.charAt(0).toUpperCase()}</span>
                          <div className="min-w-0"><div className="truncate font-bold">{u.fullName}</div><div className="truncate text-xs text-cocoa" dir="ltr">{u.email}</div></div>
                        </div>
                      </td>
                      <td className={td} dir="ltr">{u.phone ?? '—'}</td>
                      <td className={td}>
                        <Select value={u.role} disabled={locked || setRole.isPending} wrapperClassName="w-44" className="h-9"
                          onChange={(e) => setRole.mutate({ u, roleCode: e.target.value as RoleCode })} title={self ? t('users.cannotSelf') : protectedRow ? t('users.protected') : undefined}>
                          {(roles.includes(u.role) ? roles : [u.role, ...roles]).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
                        </Select>
                      </td>
                      <td className={`${td} tabular-nums`} dir="ltr">{u.lastLoginAt ? u.lastLoginAt.slice(0, 16).replace('T', ' ') : t('common.never')}</td>
                      <td className={td}><ActiveBadge active={u.isActive} /></td>
                      <td className={`${td} whitespace-nowrap text-end`}>
                        {u.isActive
                          ? <Button size="sm" variant="ghost" disabled={locked} title={protectedRow && !self ? t('users.protected') : undefined} onClick={() => onDeactivate(u)}><Power className="size-4" />{t('common.deactivate')}</Button>
                          : <Button size="sm" variant="primary" disabled={locked} onClick={() => setActive.mutate({ u, active: true })}><Check className="size-4" />{t('common.activate')}</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pagination page={list.data.page} limit={list.data.limit} total={list.data.total} onPage={setPage} />}
      </Card>
    </>
  );
}
