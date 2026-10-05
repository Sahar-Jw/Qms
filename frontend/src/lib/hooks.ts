'use client';
import { useEffect, useState } from 'react';

export function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const h = setTimeout(() => setD(v), ms); return () => clearTimeout(h); }, [v, ms]);
  return d;
}

/** Empty string -> undefined (create) or null (edit, so the backend clears the field). */
export function cleanBody<T extends Record<string, string>>(values: T, editing: boolean): Record<string, string | null | undefined> {
  const out: Record<string, string | null | undefined> = {};
  for (const [k, v] of Object.entries(values)) {
    const s = v.trim();
    out[k] = s === '' ? (editing ? null : undefined) : s;
  }
  return out;
}
