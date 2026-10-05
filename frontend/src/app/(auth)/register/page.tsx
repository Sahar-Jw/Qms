'use client';
import { CheckCircle2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button, Card, Field, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';

export default function RegisterPage() {
  const { t, has } = useI18n();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/auth/register', { ...form, phone: form.phone || undefined });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, t, has));
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-cocoa" />
        <h1 className="mt-3 text-2xl font-bold">{t('auth.pendingTitle')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-cocoa">{t('auth.pendingBody')}</p>
        <Link href="/login"><Button className="mt-5 w-full" size="lg">{t('auth.login')}</Button></Link>
      </Card>
    );
  }

  return (
    <Card className="p-7">
      <h1 className="text-2xl font-bold">{t('auth.registerTitle')}</h1>
      <p className="mb-5 mt-1 text-sm text-cocoa">{t('auth.registerSub')}</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.fullName')}><Input required maxLength={150} value={form.fullName} onChange={set('fullName')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('auth.email')}><Input type="email" dir="ltr" required value={form.email} onChange={set('email')} /></Field>
          <Field label={`${t('auth.phone')} (${t('common.optional')})`}><Input dir="ltr" value={form.phone} onChange={set('phone')} /></Field>
        </div>
        <Field label={t('auth.password')} hint={t('auth.passwordHint')}>
          <Input type="password" dir="ltr" required minLength={8} pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-800/20">{error}</p>}
        <Button type="submit" size="lg" loading={busy} className="w-full"><UserPlus className="size-4" />{t('auth.register')}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-cocoa">
        {t('auth.haveAccount')} <Link href="/login" className="font-bold text-ink underline decoration-clay underline-offset-4">{t('auth.login')}</Link>
      </p>
    </Card>
  );
}
