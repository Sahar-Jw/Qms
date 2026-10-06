'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, KeyRound, Trash2, UserCircle } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Avatar, Button, Card, CardHeader, Field, Input, PageHeader, PasswordInput } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { toastError } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import type { User } from '@/lib/types';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function ProfilePage() {
  const { t, has } = useI18n();
  const me = useMe().data!;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const setMe = (u: User) => qc.setQueryData(['me'], u);

  const [form, setForm] = useState({ fullName: me.fullName, phone: me.phone ?? '' });
  const save = useMutation({
    mutationFn: () => api.patch<User>('/auth/profile', { fullName: form.fullName.trim(), phone: form.phone.trim() }),
    onSuccess: (u) => { setMe(u); toast.success(t('common.saved')); },
    onError: (e) => toastError(e, t, has),
  });

  const upload = useMutation({
    mutationFn: (f: File) => { const fd = new FormData(); fd.append('file', f); return api.upload<User>('/auth/avatar', fd); },
    onSuccess: (u) => { setMe(u); toast.success(t('profile.photoSaved')); },
    onError: (e) => toastError(e, t, has),
  });
  const remove = useMutation({
    mutationFn: () => api.delete<User>('/auth/avatar'),
    onSuccess: (u) => { setMe(u); toast.success(t('profile.photoRemoved')); },
    onError: (e) => toastError(e, t, has),
  });

  function onPick(f: File | undefined) {
    if (fileRef.current) fileRef.current.value = '';
    if (!f) return;
    if (!TYPES.includes(f.type)) return void toast.error(t('err.INVALID_FILE_TYPE'));
    if (f.size > MAX_BYTES) return void toast.error(t('profile.tooBig'));
    upload.mutate(f);
  }

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const change = useMutation({
    mutationFn: () => api.post('/auth/change-password', pw),
    onSuccess: () => { setPw({ currentPassword: '', newPassword: '' }); toast.success(t('settings.passwordChanged')); },
    onError: (e) => toastError(e, t, has),
  });

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 border-t border-stone/40 py-2.5 text-sm first:border-t-0">
      <span className="text-cocoa">{label}</span><span className="min-w-0 truncate font-semibold">{value}</span>
    </div>
  );

  return (
    <>
      <PageHeader title={t('profile.title')} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar name={me.fullName} src={me.avatar} className="size-28 text-4xl ring-4 ring-sand" />
              <div className="mt-3 text-lg font-bold" dir="auto">{me.fullName}</div>
              <div className="text-sm text-cocoa" dir="ltr">{me.email}</div>
              <div className="mt-1 text-xs font-bold text-cocoa">{t(`roles.${me.role}`)}</div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onPick(e.target.files?.[0])} />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" loading={upload.isPending} onClick={() => fileRef.current?.click()}><ImagePlus className="size-4" />{t('profile.changePhoto')}</Button>
                {me.avatar && <Button variant="ghost" size="sm" loading={remove.isPending} onClick={() => remove.mutate()}><Trash2 className="size-4" />{t('profile.removePhoto')}</Button>}
              </div>
              <p className="mt-2 text-xs text-clay">{t('profile.photoHint')}</p>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('profile.accountData')} icon={<UserCircle className="size-4 text-cocoa" />} />
            <div className="px-5 py-2">
              {row(t('auth.email'), <bdi dir="ltr">{me.email}</bdi>)}
              {row(t('profile.role'), t(`roles.${me.role}`))}
              {row(t('common.status'), me.isActive ? t('common.active') : t('common.inactive'))}
              {row(t('profile.lastLogin'), <bdi dir="ltr">{fmt(me.lastLoginAt)}</bdi>)}
              {row(t('profile.memberSince'), <bdi dir="ltr">{fmt(me.createdAt)}</bdi>)}
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-7">
          <Card>
            <CardHeader title={t('profile.edit')} icon={<UserCircle className="size-4 text-cocoa" />} />
            <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e: FormEvent) => { e.preventDefault(); save.mutate(); }}>
              <Field label={t('auth.fullName')} required><Input required maxLength={150} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
              <Field label={t('auth.phone')}><Input dir="ltr" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label={t('auth.email')} hint={t('profile.emailLocked')} className="sm:col-span-2"><Input dir="ltr" value={me.email} disabled readOnly /></Field>
              <div className="sm:col-span-2"><Button type="submit" loading={save.isPending}>{t('common.save')}</Button></div>
            </form>
          </Card>

          <Card>
            <CardHeader title={t('settings.password')} icon={<KeyRound className="size-4 text-cocoa" />} />
            <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(e: FormEvent) => { e.preventDefault(); change.mutate(); }}>
              <Field label={t('settings.currentPassword')}><PasswordInput required autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
              <Field label={t('settings.newPassword')} hint={t('auth.passwordHint')}><PasswordInput required minLength={8} pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Button type="submit" loading={change.isPending}>{t('settings.password')}</Button></div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
