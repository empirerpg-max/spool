import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from './LoginForm';
import { safeNextPath } from '@/lib/auth/redirect';
import { getCurrentUser } from '@/lib/auth/current-user';
import { supabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Entrar · Lobby' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  const target = safeNextPath(next);
  if (!supabaseConfigured()) return <p className="py-16 text-center text-warn">Login indisponível no momento.</p>;
  if (await getCurrentUser()) redirect(target);

  return (
    <section className="space-y-6 py-8">
      <h1 className="text-center font-display text-3xl font-extrabold">Entrar no Lobby</h1>
      {erro && <p role="alert" className="text-center text-danger">Não foi possível entrar. Tente de novo.</p>}
      <LoginForm next={target} />
    </section>
  );
}
