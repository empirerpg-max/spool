import type { Metadata } from 'next';
import Link from 'next/link';
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
      <p className="text-center text-muted">É assim que as pessoas vão te ver nas comunidades.</p>
      <UsernameForm next={next} current={user.username} />
      {/* On phones "Perfil" leads here until there is an @, so the account and signing out must be reachable here too. */}
      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-line pt-6 text-sm">
        <Link href="/minha-conta" className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 font-semibold hover:bg-surface-2">
          Minha conta
        </Link>
        <form action="/sair" method="post">
          <button type="submit" className="inline-flex min-h-11 items-center rounded-full px-5 font-semibold text-muted hover:text-fg">
            Sair
          </button>
        </form>
      </div>
    </section>
  );
}
