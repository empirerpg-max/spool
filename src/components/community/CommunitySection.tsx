import Link from 'next/link';
import type { TopicSummary } from '@/lib/community/queries';
import { relativeTime } from '@/lib/format';

type Props = {
  workId: string | null;
  workPath: string;
  topics: TopicSummary[];
  hasMore: boolean;
  page: number;
  signedIn: boolean;
};

const replies = (n: number) => (n === 1 ? '1 resposta' : `${n} respostas`);

export function CommunitySection({ workId, workPath, topics, hasMore, page, signedIn }: Props) {
  if (!workId) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Comunidade</h2>
        <p className="text-neutral-500">Comunidade indisponível no momento</p>
      </section>
    );
  }
  const newTopic = `${workPath}/topicos/novo`;
  const newTopicHref = signedIn ? newTopic : `/entrar?next=${encodeURIComponent(newTopic)}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Comunidade</h2>
        <Link href={newTopicHref} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-neutral-900">
          Novo tópico
        </Link>
      </div>
      {topics.length === 0 ? (
        <p className="text-neutral-500">Ninguém começou a conversa ainda. Que tal abrir o primeiro tópico?</p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {topics.map((t) => (
            <li key={t.id} className="py-3">
              <div className="flex items-start gap-2">
                <Link href={`${workPath}/topicos/${t.id}`} className="font-medium hover:underline">{t.title}</Link>
                {t.hasSpoiler && <span className="rounded bg-amber-200 px-1.5 text-xs text-amber-900">spoiler</span>}
              </div>
              <p className="text-sm text-neutral-500">
                <span>@{t.author}</span> · <span>{replies(t.replyCount)}</span> · <span>{relativeTime(t.lastActivityAt)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      {hasMore && <Link href={`${workPath}?pagina=${page + 1}`} className="text-sm underline">Mais tópicos</Link>}
    </section>
  );
}
