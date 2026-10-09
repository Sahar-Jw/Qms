'use client';
import { ArrowRight, Check, Coins, FileText, Languages, Lock, LogIn, Printer, Receipt, Search, ShieldCheck, UserPlus, X, Workflow } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoginForm, RegisterForm } from '@/components/AuthForms';
import { LangToggle } from '@/components/Shell';
import { Button, PILL_ORDER, PillStack } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';

type Panel = 'login' | 'register' | null;

const FEATURES = [
  [Languages, 'f1'], [Coins, 'f2'], [Printer, 'f3'], [Workflow, 'f4'], [ShieldCheck, 'f5'], [Search, 'f6'],
] as const;

function AuthModal({ panel, onClose, onSwitch }: { panel: Exclude<Panel, null>; onClose: () => void; onSwitch: (p: Exclude<Panel, null>) => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 p-3 backdrop-blur-sm sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="relative my-auto w-full max-w-md rounded-3xl bg-white p-5 shadow-lift ring-1 ring-stone/50 sm:p-7">
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="absolute end-4 top-4 grid size-8 place-items-center rounded-full text-cocoa hover:bg-sand">
          <X className="size-4" />
        </button>
        {panel === 'login' ? <LoginForm onRegister={() => onSwitch('register')} /> : <RegisterForm onLogin={() => onSwitch('login')} />}
      </div>
    </div>
  );
}

/** Static preview of a quotation, drawn with CSS only. */
function QuotationPreview() {
  const { t } = useI18n();
  const rows = [['A-1042', '120', 'USD', '4,800.00'], ['B-2210', '40', 'EUR', '1,960.00'], ['C-0087', '300', 'USD', '2,250.00']];
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-md px-3 sm:px-0">
      <div className="absolute -inset-2 -z-10 rotate-2 sm:-inset-4 rounded-[2rem] bg-gradient-to-br from-clay/60 to-cocoa/40 blur-sm" />
      <div className="rounded-3xl bg-white p-4 shadow-lift ring-1 ring-stone/50 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-clay">{t('quotations.number')}</p>
            <p className="text-lg font-bold sm:text-xl" dir="ltr">QT-2026-0153</p>
          </div>
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-sand">{t('status.draft')}</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-stone/40">
          {rows.map((r, i) => (
            <div key={r[0]} className={`grid grid-cols-[1.2fr_0.7fr_0.6fr_1fr] gap-1.5 px-2.5 py-2.5 text-xs sm:gap-2 sm:px-3 sm:text-sm ${i % 2 ? 'bg-sand/30' : ''}`} dir="ltr">
              <span className="font-semibold">{r[0]}</span><span className="text-cocoa">×{r[1]}</span><span className="text-cocoa">{r[2]}</span><span className="text-end font-semibold">{r[3]}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 rounded-2xl bg-sand/50 p-3 text-sm sm:p-4">
          <p className="mb-1 text-xs font-bold text-cocoa">{t('quotations.perCurrency')}</p>
          <div className="flex justify-between font-bold" dir="ltr"><span>USD</span><span>7,050.00</span></div>
          <div className="flex justify-between font-bold" dir="ltr"><span>EUR</span><span>1,960.00</span></div>
        </div>
      </div>
    </div>
  );
}

export function Landing({ initial }: { initial: Panel }) {
  const { t } = useI18n();
  const router = useRouter();
  const me = useMe();
  const [panel, setPanel] = useState<Panel>(initial);

  // Already signed in (valid session cookie): skip the landing page.
  useEffect(() => { if (me.data) router.replace('/dashboard'); }, [me.data, router]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-stone/40 bg-sand/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-sand sm:size-10"><Receipt className="size-5" /></span>
            <span className="truncate text-lg font-bold sm:text-xl">{t('app.name')}</span>
          </div>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LangToggle />
            {/* Phones: icon-only buttons so the header never overflows (the old one showed "Login" on the Register button). */}
            <Button variant="ghost" className="max-sm:size-10 max-sm:!px-0" aria-label={t('auth.login')} onClick={() => setPanel('login')}><LogIn className="size-4 rtl:rotate-180" /><span className="max-sm:sr-only">{t('auth.login')}</span></Button>
            <Button className="max-sm:size-10 max-sm:!px-0" aria-label={t('auth.register')} onClick={() => setPanel('register')}><UserPlus className="size-4" /><span className="max-sm:sr-only">{t('auth.register')}</span></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 sm:px-5 sm:py-14 lg:grid-cols-2 lg:gap-12 lg:py-24">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-cocoa ring-1 ring-stone/60"><FileText className="size-4" />{t('landing.eyebrow')}</span>
            <h1 className="mt-5 break-words text-3xl font-bold leading-[1.25] min-[400px]:text-4xl sm:text-5xl lg:text-6xl">{t('auth.heroTitle')}</h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-cocoa sm:text-lg">{t('auth.heroSub')}</p>
            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap [&>button]:max-[419px]:w-full">
              <Button size="lg" onClick={() => setPanel('register')}>{t('landing.start')}<ArrowRight className="size-4 rtl:rotate-180" /></Button>
              <Button size="lg" variant="outline" onClick={() => setPanel('login')}><LogIn className="size-4 rtl:rotate-180" />{t('auth.login')}</Button>
            </div>
            <ul className="mt-8 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6 font-semibold text-cocoa">
              {['landing.p1', 'landing.p2', 'landing.p3'].map((k) => <li key={k} className="inline-flex items-center gap-2"><Check className="size-4 text-cocoa" />{t(k)}</li>)}
            </ul>
          </div>
          <QuotationPreview />
        </section>

        <section className="border-y border-stone/40 bg-white/50">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-14">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">{t('landing.featuresTitle')}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-cocoa">{t('landing.featuresSub')}</p>
            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(([Icon, k]) => (
                <div key={k} className="rounded-3xl bg-white p-5 shadow-lift ring-1 ring-stone/40 transition-transform sm:p-6 hover:-translate-y-1">
                  <span className="grid size-11 place-items-center rounded-2xl bg-sand text-cocoa"><Icon className="size-5" /></span>
                  <h3 className="mt-4 text-lg font-bold">{t(`landing.${k}Title`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-cocoa">{t(`landing.${k}Body`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:gap-10 sm:px-5 sm:py-14 lg:grid-cols-2">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold sm:text-3xl">{t('landing.stepsTitle')}</h2>
            <ol className="mt-6 space-y-5">
              {[1, 2, 3].map((n) => (
                <li key={n} className="flex gap-3 sm:gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-sand">{n}</span>
                  <div>
                    <h3 className="font-bold">{t(`landing.s${n}Title`)}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-cocoa">{t(`landing.s${n}Body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="min-w-0 rounded-3xl bg-gradient-to-b from-sand via-clay to-cocoa p-4 shadow-lift sm:p-8">
            <PillStack items={PILL_ORDER.map((s) => ({ key: s, label: t(`status.${s}`) }))} />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-5 sm:pb-16">
          <div className="rounded-[1.5rem] bg-ink px-5 py-10 sm:rounded-[2rem] sm:px-6 sm:py-12 text-center text-sand shadow-lift">
            <Lock className="mx-auto size-8 text-clay" />
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">{t('landing.ctaTitle')}</h2>
            <p className="mx-auto mt-2 max-w-xl text-sand/80">{t('landing.ctaSub')}</p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 min-[420px]:flex-row min-[420px]:items-center">
              <Button size="lg" variant="soft" onClick={() => setPanel('register')}><UserPlus className="size-4" />{t('auth.register')}</Button>
              <Button size="lg" variant="ghost" className="!text-sand hover:!bg-white/10" onClick={() => setPanel('login')}>{t('auth.login')}</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone/40 py-6 text-center text-xs text-cocoa">© {new Date().getFullYear()} {t('app.name')}</footer>

      {panel && <AuthModal panel={panel} onClose={() => setPanel(null)} onSwitch={setPanel} />}
    </div>
  );
}
