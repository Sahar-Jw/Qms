'use client';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, FileText, LayoutDashboard, LogOut, Menu, Package, Receipt, Search, Settings as SettingsIcon, UserCog, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';
import { hasRole, type User } from '@/lib/types';

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={cn('inline-flex rounded-full bg-white/80 p-0.5 text-xs font-bold ring-1 ring-stone/60', className)} dir="ltr">
      {(['ar', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
          className={cn('rounded-full px-3 py-1.5 transition-colors', lang === l ? 'bg-ink text-sand' : 'text-cocoa hover:bg-sand')}>
          {l === 'ar' ? 'عربي' : 'EN'}
        </button>
      ))}
    </div>
  );
}

export function Shell({ user, children }: { user: User; children: ReactNode }) {
  const { t, pick } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const settings = useSettings();
  const company = settings.data?.issuingCompany;

  const nav = [
    { href: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { href: '/quotations', icon: FileText, label: t('nav.quotations') },
    { href: '/customers', icon: Users, label: t('nav.customers') },
    { href: '/materials', icon: Package, label: t('nav.materials') },
    ...(hasRole(user.role, 'general_manager')
      ? [{ href: '/companies', icon: Building2, label: t('nav.companies') }, { href: '/users', icon: UserCog, label: t('nav.users') }]
      : []),
    { href: '/settings', icon: SettingsIcon, label: t('nav.settings') },
  ];

  // keep the box in sync with the page: restore text on /search reload, empty it when leaving search
  useEffect(() => {
    if (pathname.startsWith('/search')) {
      const v = new URLSearchParams(window.location.search).get('q') ?? '';
      setQ((cur) => cur || v);
    } else setQ('');
  }, [pathname]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function runSearch(v: string) {
    const s = v.trim();
    const onSearch = pathRef.current.startsWith('/search');
    if (s) {
      const url = `/search?q=${encodeURIComponent(s)}`;
      if (onSearch) router.replace(url); else router.push(url);
    } else if (onSearch) router.replace('/dashboard');
  }

  function onSearchChange(v: string) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) runSearch(v);
    else timer.current = setTimeout(() => runSearch(v), 300);
  }

  function clearSearch() {
    if (timer.current) clearTimeout(timer.current);
    setQ('');
    runSearch('');
    inputRef.current?.focus();
  }

  async function logout() {
    try { await api.post('/auth/logout'); } finally {
      qc.clear();
      router.replace('/login');
    }
  }

  return (
    <div className="min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={cn(
        'fixed inset-y-0 start-0 z-40 flex w-64 flex-col bg-ink text-sand transition-transform duration-200',
        !open && 'max-lg:-translate-x-full max-lg:rtl:translate-x-full',
      )}>
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <span className="grid size-11 place-items-center rounded-full bg-sand text-ink"><Receipt className="size-5" /></span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-lg font-bold">{t('app.name')}</div>
            <div className="truncate text-[11px] text-stone">{t('app.tagline')}</div>
          </div>
          <button className="ms-auto grid size-8 place-items-center rounded-full hover:bg-cocoa lg:hidden" onClick={() => setOpen(false)}><X className="size-4" /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/');
            return (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className={cn('flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold transition-colors', active ? 'bg-sand text-ink' : 'text-sand/85 hover:bg-cocoa/70')}>
                <n.icon className="size-[18px]" />{n.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 flex items-center gap-3 rounded-2xl bg-cocoa/45 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-clay text-base font-bold text-ink">{user.fullName.trim().charAt(0).toUpperCase()}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <div dir="auto" className="truncate text-start text-sm font-bold">{user.fullName}</div>
            <div className="truncate text-xs text-stone">{t(`roles.${user.role}`)}</div>
          </div>
          <button onClick={logout} title={t('common.logout')} aria-label={t('common.logout')} className="grid size-9 place-items-center rounded-full hover:bg-ink"><LogOut className="size-4 rtl:rotate-180" /></button>
        </div>
      </aside>

      <div className="lg:ms-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 bg-sand/75 px-4 backdrop-blur-md lg:px-6">
          <button className="grid size-10 place-items-center rounded-full bg-white/80 ring-1 ring-stone/60 lg:hidden" onClick={() => setOpen(true)} aria-label="menu"><Menu className="size-5" /></button>
          <form className="relative max-w-xl flex-1" onSubmit={(e) => { e.preventDefault(); if (timer.current) clearTimeout(timer.current); runSearch(q); }}>
            <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-clay" />
            <input ref={inputRef} value={q} onChange={(e) => onSearchChange(e.target.value)} placeholder={t('nav.search')}
              className="h-11 w-full rounded-full border border-stone/70 bg-white/85 ps-11 pe-10 text-sm placeholder:text-clay focus:border-cocoa focus:outline-none focus:ring-4 focus:ring-clay/30" />
            {q && (
              <button type="button" onClick={clearSearch} aria-label={t('common.clear')} title={t('common.clear')}
                className="absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-cocoa hover:bg-sand">
                <X className="size-4" />
              </button>
            )}
          </form>
          <div className="ms-auto flex items-center gap-2">
            {company && (
              <Link href="/settings" className="hidden items-center gap-2 rounded-full bg-white/80 py-1 pe-4 ps-1 text-sm font-semibold ring-1 ring-stone/60 hover:bg-white md:flex" title={t('quotations.issuingCompany')}>
                {company.logo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`/uploads/${company.logo}`} alt="" className="size-8 rounded-full bg-white object-contain" />
                  : <span className="grid size-8 place-items-center rounded-full bg-cocoa text-xs font-bold text-white">{pick(company.nameAr, company.nameEn).charAt(0)}</span>}
                <span className="max-w-40 truncate">{pick(company.nameAr, company.nameEn)}</span>
              </Link>
            )}
            <LangToggle />
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 pb-8 pt-3 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
