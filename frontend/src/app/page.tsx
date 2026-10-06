import { Landing } from '@/components/Landing';

export default async function Home({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const { auth } = await searchParams;
  return <Landing initial={auth === 'login' || auth === 'register' ? auth : null} />;
}
