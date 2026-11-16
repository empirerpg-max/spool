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
        <p className="text-muted">Comunidade indisponível no momento</p>
      </section>
    );
  }
  const newTopic = `${workPath}/topicos/novo`;
  const newTopicHref = signedIn ? newTopic : `/entrar?next=${encodeURIComponent(newTopic)}`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Comunidade</h2>
        <Link href={newTopicHref} className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg">
          Novo tópico
        </Link>
      </div>
      {topics.length === 0 ? (
        <p className="text-muted">Ninguém começou a conversa ainda. Que tal abrir o primeiro tópico?</p>
      ) : (
        <ul className="divide-y divide-line">
          {topics.map((t) => (
            <li key={t.id} className="py-3">
              <div className="flex items-start gap-2">
                <Link href={`${workPath}/topicos/${t.id}`} className="font-medium hover:underline">{t.title}</Link>
                {t.hasSpoiler && <span className="rounded bg-warn/20 px-1.5 text-xs font-semibold text-warn">spoiler</span>}
              </div>
              <p className="text-sm text-muted">
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
