import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReplyForm } from '@/components/community/ReplyForm';
import { ReportButton } from '@/components/community/ReportButton';
import { Spoiler, spoilerLabel } from '@/components/community/Spoiler';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createReply } from '@/lib/community/actions';
import { getTopicWithReplies } from '@/lib/community/queries';
import { relativeTime } from '@/lib/format';
import { WatchButton } from '@/components/social/WatchButton';
import { isWatchingTopic } from '@/lib/social/post-queries';
import { loadWork } from '../../load';

type Params = Promise<{ kind: string; externalId: string; topicId: string }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(params: Params, page = 1) {
  const { kind, externalId, topicId } = await params;
  if (!UUID.test(topicId)) notFound();
  const work = await loadWork(kind, externalId);
  if (!work?.id) notFound();
  const data = await getTopicWithReplies(topicId, page);
  if (!data || data.topic.workId !== work.id) notFound();
  return { work, ...data };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { topic, work } = await load(params);
  return { title: `${topic.title} · ${work.work.title} · Lobby` };
}

const Body = ({ text }: { text: string }) => <div className="whitespace-pre-wrap break-words">{text}</div>;

export default async function TopicPage({ params, searchParams }: { params: Params; searchParams: Promise<{ pagina?: string }> }) {
  const page = Math.max(1, Number((await searchParams).pagina) || 1);
  const { work, topic, replies, hasMore } = await load(params, page);
  const user = await getCurrentUser();
  const watching = user ? await isWatchingTopic(topic.id).catch(() => false) : false;
  const topicPath = `${work.path}/topicos/${topic.id}`;
  const canWrite = Boolean(user?.username) && !user?.banned;

  return (
    <article className="space-y-6">
      <p className="text-sm text-muted"><Link href={work.path} className="hover:underline">← {work.work.title}</Link></p>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{topic.title}</h1>
        <p className="text-sm text-muted">@{topic.author} · {relativeTime(topic.createdAt)}</p>
      </header>
      {topic.hasSpoiler ? (
        <Spoiler label={spoilerLabel(topic.spoilerSeason, topic.spoilerEpisode)}><Body text={topic.body} /></Spoiler>
      ) : (
        <Body text={topic.body} />
      )}
      {user && (
        <div className="flex flex-wrap items-center gap-4">
          <WatchButton target="topic" id={topic.id} path={topicPath} initialWatching={watching} />
          <ReportButton topicId={topic.id} />
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{topic.replyCount === 1 ? '1 resposta' : `${topic.replyCount} respostas`}</h2>
        <ul className="space-y-4">
          {replies.map((r) => (
            <li key={r.id} className="space-y-1 border-l-2 border-line pl-3">
              <p className="text-sm text-muted">@{r.author} · {relativeTime(r.createdAt)}</p>
              {r.hasSpoiler ? <Spoiler><Body text={r.body} /></Spoiler> : <Body text={r.body} />}
              {user && <ReportButton postId={r.id} />}
            </li>
          ))}
        </ul>
        {hasMore && <Link href={`${topicPath}?pagina=${page + 1}`} className="text-sm underline">Mais respostas</Link>}
      </section>

      {canWrite ? (
        <ReplyForm action={createReply.bind(null, topicPath, topic.id)} />
      ) : user?.banned ? (
        <p className="text-danger">Sua conta está suspensa.</p>
      ) : user ? (
        <Link href={`/bem-vindo?next=${encodeURIComponent(topicPath)}`} className="underline">Escolha um nome de usuário para responder</Link>
      ) : (
        <Link href={`/entrar?next=${encodeURIComponent(topicPath)}`} className="underline">Entre para responder</Link>
      )}
    </article>
  );
}
