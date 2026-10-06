'use client';
import { ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Inbox, Loader2, X } from 'lucide-react';
import {
  forwardRef, useEffect, useId, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';
import { useActivity } from '@/lib/activity';
import { useI18n } from '@/lib/i18n';
import type { QStatus } from '@/lib/types';

/* ------------------------------------------------------------------ buttons */
type Variant = 'primary' | 'dark' | 'soft' | 'outline' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-cocoa text-white hover:bg-ink shadow-[0_8px_16px_-8px_rgb(41_28_14/0.7)]',
  dark: 'bg-ink text-sand hover:bg-black',
  soft: 'bg-sand text-ink hover:bg-stone/70',
  outline: 'border border-clay text-cocoa hover:bg-sand/70',
  ghost: 'text-cocoa hover:bg-sand/80',
  danger: 'border border-red-800/40 bg-white text-red-800 hover:bg-red-50',
};
const sizes = { sm: 'h-8 px-3.5 text-xs gap-1.5', md: 'h-10 px-5 text-sm gap-2', lg: 'h-12 px-6 text-sm gap-2' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: keyof typeof sizes; loading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...rest }, ref,
) {
  return (
    <button
      ref={ref} type={type} disabled={disabled || loading}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50', variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ fields */
const inputBase =
  'w-full rounded-xl border bg-white px-3.5 text-sm text-ink placeholder:text-clay transition-shadow focus:border-cocoa focus:outline-none focus:ring-4 focus:ring-clay/30 disabled:bg-sand/50 disabled:text-cocoa';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest }, ref,
) {
  return <input ref={ref} className={cn(inputBase, 'h-10', invalid ? 'border-red-700' : 'border-stone', className)} {...rest} />;
});

/** Profile picture, or the first letter of the name when there is none. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  return src
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={`/uploads/${src}`} alt="" className={cn('shrink-0 rounded-full bg-white object-cover', className)} />
    : <span className={cn('grid shrink-0 place-items-center rounded-full bg-clay font-bold text-ink', className)}>{name.trim().charAt(0).toUpperCase()}</span>;
}

/** Password field with a show / hide toggle. Same props as Input. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { invalid?: boolean }>(function PasswordInput(
  { className, ...rest }, ref,
) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="relative" dir="ltr">
      <Input ref={ref} type={show ? 'text' : 'password'} className={cn('pr-11', className)} {...rest} />
      <button type="button" tabIndex={-1} onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? t('common.hidePassword') : t('common.showPassword')} title={show ? t('common.hidePassword') : t('common.showPassword')}
        className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-cocoa transition-colors hover:bg-sand">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, ...rest }, ref,
) {
  return <textarea ref={ref} rows={3} className={cn(inputBase, 'py-2.5', invalid ? 'border-red-700' : 'border-stone', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; wrapperClassName?: string }>(function Select(
  { className, invalid, wrapperClassName, children, ...rest }, ref,
) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select ref={ref} className={cn(inputBase, 'h-10 cursor-pointer appearance-none pe-9', invalid ? 'border-red-700' : 'border-stone', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-cocoa" />
    </div>
  );
});

export function Field({ label, error, hint, children, className, required }: { label?: ReactNode; error?: string; hint?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn('block min-w-0', className)}>
      {label && <span className="mb-1 block text-xs font-semibold text-cocoa">{label}{required && <span className="ms-0.5 text-red-600" aria-hidden>*</span>}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-red-700">{error}</span> : hint ? <span className="mt-1 block text-xs text-clay">{hint}</span> : null}
    </label>
  );
}

/* ------------------------------------------------------------------ surfaces */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-2xl border border-stone/60 bg-white/90 shadow-lift', className)}>{children}</section>;
}

export function CardHeader({ title, actions, icon }: { title: ReactNode; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 border-b border-stone/50 px-5 py-3">
      <h2 className="flex items-center gap-2 text-base font-bold text-ink">{icon}{title}</h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold leading-tight text-ink">{title}</h1>
        {sub && <p className="text-sm text-cocoa">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ status */
export const STATUS_STYLE: Record<QStatus, { badge: string; pill: string }> = {
  draft: { badge: 'bg-sand text-ink ring-1 ring-inset ring-stone', pill: 'bg-sand text-ink' },
  issued: { badge: 'bg-stone text-ink', pill: 'bg-stone text-ink' },
  expired: { badge: 'bg-clay text-ink', pill: 'bg-clay text-ink' },
  locked: { badge: 'bg-cocoa text-white', pill: 'bg-cocoa text-white' },
  invoiced: { badge: 'bg-ink text-sand', pill: 'bg-ink text-sand' },
};

export function StatusBadge({ status }: { status: QStatus }) {
  const { t } = useI18n();
  return <span className={cn('inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold', STATUS_STYLE[status].badge)}>{t(`status.${status}`)}</span>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useI18n();
  return (
    <span className={cn('inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold', active ? 'bg-cocoa text-white' : 'bg-stone/60 text-cocoa')}>
      {active ? t('common.active') : t('common.inactive')}
    </span>
  );
}

/* ------------------------------------------------------------------ misc */
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-cocoa', className)} />;
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-cocoa">
      <Spinner /> {t('common.loading')}
    </div>
  );
}

function useDelayed(on: boolean, ms: number) {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (!on) { setV(false); return; }
    const h = setTimeout(() => setV(true), ms);
    return () => clearTimeout(h);
  }, [on, ms]);
  return v;
}

/** Top progress bar for any API call + a "working" pill for saves/changes that take a moment. */
export function GlobalLoader() {
  const { t } = useI18n();
  const { all, writes } = useActivity();
  const bar = useDelayed(all > 0, 120);
  const pill = useDelayed(writes > 0, 400);
  return (
    <>
      <div aria-hidden className={cn('pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden transition-opacity duration-200', bar ? 'opacity-100' : 'opacity-0')}>
        <div className="loader-bar h-full w-1/3 rounded-full bg-cocoa" />
      </div>
      {pill && (
        <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-6 z-[60] flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-sand shadow-lift">
            <Loader2 className="size-4 animate-spin" />{t('common.working')}
          </div>
        </div>
      )}
    </>
  );
}

export function PageLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status">
      <Spinner className="size-9" />
    </div>
  );
}

export function Empty({ text, action }: { text?: string; action?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-cocoa">
      <span className="grid size-12 place-items-center rounded-full bg-sand"><Inbox className="size-6 text-cocoa" /></span>
      {text ?? t('common.noData')}
      {action}
    </div>
  );
}

export function Pagination({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return <div className="border-t border-stone/50 px-5 py-2.5 text-xs text-cocoa">{total} {t('common.results')}</div>;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-stone/50 px-5 py-2.5 text-xs text-cocoa">
      <span>{total} {t('common.results')}</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t('common.prev')}>
          <ChevronRight className="size-4 ltr:hidden" /><ChevronLeft className="size-4 rtl:hidden" />
        </Button>
        <span dir="ltr" className="min-w-16 text-center font-semibold tabular-nums text-ink">{page} / {pages}</span>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t('common.next')}>
          <ChevronLeft className="size-4 ltr:hidden" /><ChevronRight className="size-4 rtl:hidden" />
        </Button>
      </div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const id = useId();
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 p-3 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={id} className={cn('my-auto w-full overflow-hidden rounded-3xl bg-white shadow-2xl', wide ? 'max-w-3xl' : 'max-w-xl')}>
        <div className="flex items-center justify-between gap-3 bg-ink px-5 py-3.5 text-sand">
          <h2 id={id} className="text-base font-bold">{title}</h2>
          <button onClick={onClose} aria-label={t('common.close')} className="grid size-8 place-items-center rounded-full hover:bg-cocoa"><X className="size-4" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone/50 bg-sand/40 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** The five palette pills stacked and overlapping - the visual signature of the app. */
export const PILL_ORDER: QStatus[] = ['invoiced', 'locked', 'expired', 'issued', 'draft'];
export function PillStack({ items }: { items: { key: QStatus; label: string; value?: ReactNode; onClick?: () => void }[] }) {
  return (
    <div className="flex flex-col">
      {items.map((it, i) => {
        const Tag = it.onClick ? 'button' : 'div';
        return (
          <Tag
            key={it.key} onClick={it.onClick} style={{ zIndex: i + 1 }}
            className={cn('relative flex h-[4.25rem] items-center justify-between rounded-full px-7 text-start shadow-pill', i > 0 && '-mt-5', STATUS_STYLE[it.key].pill, it.onClick && 'cursor-pointer transition-transform hover:-translate-y-0.5')}
          >
            <span className="text-sm font-semibold">{it.label}</span>
            {it.value !== undefined && <span className="text-2xl font-bold tabular-nums">{it.value}</span>}
          </Tag>
        );
      })}
    </div>
  );
}

export const th = 'whitespace-nowrap bg-sand/70 px-4 py-2.5 text-start text-xs font-bold text-cocoa';
export const td = 'px-4 py-2.5 align-middle text-sm';
export const tr = 'border-t border-stone/40 transition-colors even:bg-sand/25 hover:bg-sand/60';
