import Link from 'next/link';
import { KindTag } from '@/components/KindTag';
import { relativeTime } from '@/lib/format';
import { kindBorderClass } from '@/lib/kind-style';
import { activityVerb, ratingStars } from '@/lib/social/activity';
import type { Person, TimelineEntry } from '@/lib/social/types';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { SpoilerReveal } from './SpoilerReveal';

const SNIPPET = 280;
const snippet = (text: string) => (text.length > SNIPPET ? `${text.slice(0, SNIPPET).trimEnd()}…` : text);

function Who({ person }: { person: Person }) {
  return <Link href={`/@${person.username}`} className="font-semibold hover:underline">@{person.username}</Link>;
}

const ratingLabel = (r: number) => `Nota ${String(r).replace('.', ',')} de 5`;

/** "(foto) @micael viu [capa] Duna ★★★★½ · há 2 h" — something a followed person marked in their list. */
function ListActivity({ entry: e }: { entry: Extract<TimelineEntry, { type: 'list' }> }) {
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <Avatar url={e.actor.avatarUrl} name={e.actor.displayName ?? e.actor.username} size="sm" />
      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 break-words">
        <Who person={e.actor} />
        <span>{activityVerb(e.status, e.work.kind)}</span>
        <Link href={e.href} className="inline-flex min-w-0 items-center gap-2 font-semibold hover:underline">
          {e.work.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.work.posterUrl} alt="" width={24} height={36} loading="lazy" className={`h-9 w-6 shrink-0 rounded border-b-2 object-cover ${kindBorderClass(e.work.kind)}`} />
          ) : (
            <span aria-hidden="true" className={`h-9 w-6 shrink-0 rounded border-b-2 bg-surface-2 ${kindBorderClass(e.work.kind)}`} />
          )}
          <span className="min-w-0">{e.work.title}</span>
        </Link>
        {e.rating !== null && (
          <span role="img" aria-label={ratingLabel(e.rating)} className="text-warn">{ratingStars(e.rating)}</span>
        )}
        <span className="text-sm text-muted">· {relativeTime(e.createdAt)}</span>
      </p>
    </article>
  );
}

/** One timeline entry: a post, a published review, a reply in a followed conversation or list activity. */
export function TimelineItem({ entry: e }: { entry: TimelineEntry }) {
  if (e.type === 'post') return <PostCard post={e.post} />;
  if (e.type === 'list') return <ListActivity entry={e} />;

  const box = 'flex gap-3 rounded-2xl border border-line bg-surface p-4';
  if (e.type === 'review') {
    return (
      <article className={box}>
        <Avatar url={e.actor.avatarUrl} name={e.actor.displayName ?? e.actor.username} size="sm" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="break-words">
            <Who person={e.actor} /> publicou uma resenha de <Link href={e.href} className="font-semibold hover:underline">{e.work.title}</Link>
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <KindTag kind={e.work.kind} />
            {e.hasSpoiler && <span className="rounded bg-warn/20 px-1.5 text-xs font-semibold text-warn">spoiler</span>}
            <span>{relativeTime(e.createdAt)}</span>
          </p>
        </div>
      </article>
    );
  }

  const body = <p className="whitespace-pre-wrap break-words text-sm">{snippet(e.body)}</p>;
  return (
    <article className={box}>
      <Avatar url={e.actor.avatarUrl} name={e.actor.displayName ?? e.actor.username} size="sm" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="break-words">
          <Who person={e.actor} /> respondeu em <Link href={e.href} className="font-semibold hover:underline">{e.conversation}</Link>
          <span className="text-sm text-muted"> · {relativeTime(e.createdAt)}</span>
        </p>
        <div className="border-l-2 border-line pl-3">{e.hasSpoiler ? <SpoilerReveal>{body}</SpoilerReveal> : body}</div>
      </div>
    </article>
  );
}
