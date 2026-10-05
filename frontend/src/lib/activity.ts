'use client';
import { useSyncExternalStore } from 'react';

/** Counts in-flight API calls so the UI can show that something is loading. */
let all = 0;
let writes = 0;
const subs = new Set<() => void>();
let snap = { all: 0, writes: 0 };
const emit = () => { snap = { all, writes }; subs.forEach((f) => f()); };

export function trackRequest(method: string): () => void {
  const isWrite = method !== 'GET';
  all++; if (isWrite) writes++;
  emit();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    all--; if (isWrite) writes--;
    emit();
  };
}

export function useActivity() {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => snap,
    () => snap,
  );
}
