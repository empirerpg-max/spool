import Link from 'next/link';
import { KindTag } from '@/components/KindTag';
import { workPath } from '@/lib/catalog/kind';
import { relativeTime } from '@/lib/format';
import type { ProfileReview } from '@/lib/social/queries';

const replies = (n: number) => (n === 1 ? '1 resposta' : `${n} respostas`);

/** "Resenhas" tab: reviews this person published in the communities (text stays on the topic page). */
export function ProfileReviews({ reviews }: { reviews: ProfileReview[] }) {
  if (reviews.length === 0) return <p className="text-muted">Nenhuma resenha publicada ainda.</p>;
  return (
    <ul className="divide-y divide-line">
      {reviews.map((r) => {
        const href = `${workPath(r.work.kind, r.work.externalId)}/topicos/${r.topicId}`;
        return (
          <li key={r.topicId} className="flex items-center gap-3 py-3">
            {r.work.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.work.posterUrl} alt="" loading="lazy" className="aspect-[2/3] w-12 shrink-0 rounded object-cover" />
            ) : (
              <span className="aspect-[2/3] w-12 shrink-0 rounded bg-surface-2" />
            )}
            <div className="min-w-0 space-y-1">
              <Link href={href} className="font-medium hover:underline">Resenha de {r.work.title}</Link>
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <KindTag kind={r.work.kind} />
                {r.hasSpoiler && <span className="rounded bg-warn/20 px-1.5 text-xs font-semibold text-warn">spoiler</span>}
                <span>{replies(r.replyCount)}</span>
                <span>{relativeTime(r.createdAt)}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
