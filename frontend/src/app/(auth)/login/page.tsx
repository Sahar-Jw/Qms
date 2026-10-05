'use client';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Card, Field, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const { t, has } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
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

  return (
    <Card className="p-7">
      <h1 className="text-2xl font-bold">{t('auth.loginTitle')}</h1>
      <p className="mb-5 mt-1 text-sm text-cocoa">{t('auth.loginSub')}</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.email')}><Input type="email" autoComplete="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label={t('auth.password')}><Input type="password" autoComplete="current-password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-800/20">{error}</p>}
        <Button type="submit" size="lg" loading={busy} className="w-full"><LogIn className="size-4 rtl:rotate-180" />{t('auth.login')}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-cocoa">
        {t('auth.noAccount')} <Link href="/register" className="font-bold text-ink underline decoration-clay underline-offset-4">{t('auth.register')}</Link>
      </p>
    </Card>
  );
}
