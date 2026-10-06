'use client';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LogIn, Mail, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Field, Input, PasswordInput } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import type { User } from '@/lib/types';

const linkBtn = 'font-bold text-ink underline decoration-clay underline-offset-4';
const errBox = 'rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-800/20';

export function LoginForm({ onRegister }: { onRegister: () => void }) {
  const { t, has } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await api.post<{ user: User }>('/auth/login', { email, password });
      qc.clear();
      qc.setQueryData(['me'], res.user);
      router.replace('/dashboard');
    } catch (err) {
      setError(errorMessage(err, t, has));
      setBusy(false);
    }
  }

  async function forgot(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, t, has));
    } finally { setBusy(false); }
  }

  if (mode === 'forgot') {
    return (
      <>
        <h2 className="text-2xl font-bold">{t('auth.forgotTitle')}</h2>
        <p className="mb-5 mt-1 text-sm text-cocoa">{t('auth.forgotSub')}</p>
        {sent ? (
          <div className="rounded-2xl bg-sand/60 p-5 text-center">
            <CheckCircle2 className="mx-auto size-10 text-cocoa" />
            <p className="mt-2 text-sm leading-relaxed text-cocoa">{t('auth.forgotSent')}</p>
          </div>
        ) : (
          <form onSubmit={forgot} className="space-y-4">
            <Field label={t('auth.email')}><Input type="email" autoComplete="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            {error && <p role="alert" className={errBox}>{error}</p>}
            <Button type="submit" size="lg" loading={busy} className="w-full"><Mail className="size-4" />{t('auth.sendLink')}</Button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-cocoa">
          <button type="button" className={linkBtn} onClick={() => { setMode('login'); setSent(false); setError(''); }}>{t('auth.backToLogin')}</button>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold">{t('auth.loginTitle')}</h2>
      <p className="mb-5 mt-1 text-sm text-cocoa">{t('auth.loginSub')}</p>
      <form onSubmit={login} className="space-y-4">
        <Field label={t('auth.email')}><Input type="email" autoComplete="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t('auth.password')}><PasswordInput autoComplete="current-password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <div className="-mt-1 text-end">
          <button type="button" className="text-xs font-semibold text-cocoa underline decoration-clay underline-offset-4" onClick={() => { setMode('forgot'); setError(''); }}>{t('auth.forgot')}</button>
        </div>
        {error && <p role="alert" className={errBox}>{error}</p>}
        <Button type="submit" size="lg" loading={busy} className="w-full"><LogIn className="size-4 rtl:rotate-180" />{t('auth.login')}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-cocoa">
        {t('auth.noAccount')} <button type="button" className={linkBtn} onClick={onRegister}>{t('auth.register')}</button>
      </p>
    </>
  );
}

export function RegisterForm({ onLogin }: { onLogin: () => void }) {
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
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-cocoa" />
        <h2 className="mt-3 text-2xl font-bold">{t('auth.pendingTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-cocoa">{t('auth.pendingBody')}</p>
        <Button className="mt-5 w-full" size="lg" onClick={onLogin}>{t('auth.login')}</Button>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold">{t('auth.registerTitle')}</h2>
      <p className="mb-5 mt-1 text-sm text-cocoa">{t('auth.registerSub')}</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.fullName')}><Input required maxLength={150} value={form.fullName} onChange={set('fullName')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('auth.email')}><Input type="email" dir="ltr" required value={form.email} onChange={set('email')} /></Field>
          <Field label={`${t('auth.phone')} (${t('common.optional')})`}><Input dir="ltr" value={form.phone} onChange={set('phone')} /></Field>
        </div>
        <Field label={t('auth.password')} hint={t('auth.passwordHint')}>
          <PasswordInput dir="ltr" required minLength={8} pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        {error && <p role="alert" className={errBox}>{error}</p>}
        <Button type="submit" size="lg" loading={busy} className="w-full"><UserPlus className="size-4" />{t('auth.register')}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-cocoa">
        {t('auth.haveAccount')} <button type="button" className={linkBtn} onClick={onLogin}>{t('auth.login')}</button>
      </p>
    </>
  );
}
