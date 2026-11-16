import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PostComposer } from '@/components/social/PostComposer';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getWorkById } from '@/lib/social/post-queries';

export const metadata: Metadata = { title: 'Publicar · Lobby' };

export default async function PublishPage({ searchParams }: { searchParams: Promise<{ obra?: string }> }) {
  const { obra } = await searchParams;
  const here = obra ? `/publicar?obra=${encodeURIComponent(obra)}` : '/publicar';
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(here)}`);
  const work = obra ? await getWorkById(obra) : null;

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-extrabold">Publicar</h1>
        <p className="text-muted">Toda publicação fala de um filme, série ou livro. Quem segue você vê na timeline, e ela aparece também na comunidade da obra.</p>
      </header>
      {user.banned ? (
        <p className="text-danger">Sua conta está suspensa.</p>
      ) : !user.username ? (
        <Link href={`/bem-vindo?next=${encodeURIComponent(here)}`} className="underline">Escolha um nome de usuário para publicar</Link>
      ) : (
        <PostComposer work={work ?? undefined} />
      )}
    </section>
  );
}
