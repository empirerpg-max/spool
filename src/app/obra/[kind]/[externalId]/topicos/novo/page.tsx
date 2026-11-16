import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { TopicForm } from '@/components/community/TopicForm';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createTopic } from '@/lib/community/actions';
import { loadWork } from '../../load';

export const metadata: Metadata = { title: 'Novo tópico · Lobby' };

export default async function NewTopicPage({ params }: { params: Promise<{ kind: string; externalId: string }> }) {
  const { kind, externalId } = await params;
  const result = await loadWork(kind, externalId);
  if (!result?.id) notFound();
  const here = `${result.path}/topicos/novo`;

  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(here)}`);
  if (!user.username) redirect(`/bem-vindo?next=${encodeURIComponent(here)}`);
  if (user.banned) return <p className="py-16 text-center text-danger">Sua conta está suspensa.</p>;

  return (
    <section className="space-y-6">
      <p className="text-sm text-muted"><Link href={result.path} className="hover:underline">← {result.work.title}</Link></p>
      <h1 className="text-2xl font-bold">Novo tópico</h1>
      <TopicForm action={createTopic.bind(null, result.path, result.id)} isSeries={result.work.kind === 'series'} />
    </section>
  );
}
