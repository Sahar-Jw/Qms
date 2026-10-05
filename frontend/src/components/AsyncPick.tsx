'use client';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useI18n } from '@/lib/i18n';

function useDebounced<T>(v: T, ms = 250) {
  const [d, setD] = useState(v);
  useEffect(() => { const h = setTimeout(() => setD(v), ms); return () => clearTimeout(h); }, [v, ms]);
  return d;
}

interface Props<T extends { id: number }> {
  value: T | null;
  onChange: (v: T | null) => void;
  /** Server-side search; called with the typed text (debounced). */
  fetcher: (q: string) => Promise<T[]>;
  cacheKey: string;
  label: (v: T) => string;
  sub?: (v: T) => string;
  placeholder?: string;
  invalid?: boolean;
}

/** Search-as-you-type picker used for customers and materials (the lists can be long). */
export function AsyncPick<T extends { id: number }>({ value, onChange, fetcher, cacheKey, label, sub, placeholder, invalid }: Props<T>) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const dq = useDebounced(text);
  const ref = useRef<HTMLDivElement>(null);
  const res = useQuery({ queryKey: ['pick', cacheKey, dq], queryFn: () => fetcher(dq), enabled: open, staleTime: 10_000 });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const pickItem = (v: T) => { onChange(v); setOpen(false); setText(''); };

  return (
    <div ref={ref} className="relative">
      <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-clay" />
      <input
        value={open ? text : value ? label(value) : ''}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setText(''); }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && open) { e.preventDefault(); if (res.data?.[0]) pickItem(res.data[0]); }
        }}
        className={cn('h-10 w-full rounded-xl border bg-white ps-10 pe-9 text-sm placeholder:text-clay focus:border-cocoa focus:outline-none focus:ring-4 focus:ring-clay/30', invalid ? 'border-red-700' : 'border-stone')}
      />
      {value && !open && (
        <button type="button" onClick={() => onChange(null)} className="absolute end-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-cocoa hover:bg-sand" aria-label="clear"><X className="size-3.5" /></button>
      )}
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full min-w-64 overflow-y-auto rounded-2xl border border-stone bg-white p-1.5 shadow-xl">
          {res.isFetching && !res.data ? (
            <div className="flex items-center gap-2 p-3 text-sm text-cocoa"><Loader2 className="size-4 animate-spin" />{t('common.loading')}</div>
          ) : res.data?.length ? (
            res.data.map((it) => (
              <button type="button" key={it.id} onMouseDown={(e) => e.preventDefault()} onClick={() => pickItem(it)}
                className={cn('flex w-full flex-col rounded-xl px-3 py-2 text-start hover:bg-sand', value?.id === it.id && 'bg-sand')}>
                <span className="text-sm font-semibold">{label(it)}</span>
                {sub && <span className="text-xs text-cocoa">{sub(it)}</span>}
              </button>
            ))
          ) : <div className="p-3 text-sm text-cocoa">{t('quotations.noResults')}</div>}
        </div>
      )}
    </div>
  );
}
