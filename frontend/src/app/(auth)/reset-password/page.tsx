'use client';
import { CheckCircle2, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { Button, Card, Field, PasswordInput } from '@/components/ui';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';

function ResetForm() {
  const { t, has } = useI18n();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, t, has));
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-cocoa" />
        <h1 className="mt-3 text-2xl font-bold">{t('auth.resetDone')}</h1>
        <Link href="/?auth=login"><Button className="mt-5 w-full" size="lg">{t('auth.login')}</Button></Link>
      </Card>
    );
  }

  return (
    <Card className="p-7">
      <h1 className="text-2xl font-bold">{t('auth.resetTitle')}</h1>
      <p className="mb-5 mt-1 text-sm text-cocoa">{t('auth.resetSub')}</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.newPassword')} hint={t('auth.passwordHint')}>
          <PasswordInput dir="ltr" required minLength={8} pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {(!token || error) && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800 ring-1 ring-red-800/20">{!token ? t('err.INVALID_RESET_TOKEN') : error}</p>}
        <Button type="submit" size="lg" loading={busy} disabled={!token} className="w-full"><KeyRound className="size-4" />{t('auth.resetBtn')}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-cocoa">
        <Link href="/?auth=login" className="font-bold text-ink underline decoration-clay underline-offset-4">{t('auth.backToLogin')}</Link>
      </p>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetForm /></Suspense>;
}
