'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Landing } from '@/components/Landing';

// Static export: the page is pre-built, so ?auth=login|register is read in the browser instead of on the server.
function Home() {
  const auth = useSearchParams().get('auth');
  return <Landing initial={auth === 'login' || auth === 'register' ? auth : null} />;
}

export default function HomePage() {
  return <Suspense fallback={null}><Home /></Suspense>;
}
