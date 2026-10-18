'use client';
import { useSyncExternalStore } from 'react';

/** Tracks page navigation and other work that should surface in the global loader. */
let all = 0;
const subs = new Set<() => void>();
let snap = { all: 0 };
const emit = () => { snap = { all }; subs.forEach((f) => f()); };

export function trackRequest(): () => void {
  all++;
  emit();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    all--;
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
