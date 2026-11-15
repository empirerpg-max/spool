import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { UsernameForm } from './UsernameForm';
import { getCurrentUser } from '@/lib/auth/current-user';
import { safeNextPath } from '@/lib/auth/redirect';

export const metadata: Metadata = { title: 'Bem-vindo · Lobby' };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent('/bem-vindo')}`);

  return (
    <section className="space-y-6 py-8">
      <h1 className="text-center text-2xl font-bold">Escolha seu nome de usuário</h1>
      <p className="text-center text-neutral-500">É assim que as pessoas vão te ver nas comunidades.</p>
      <UsernameForm next={next} current={user.username} />
    </section>
  );
}
