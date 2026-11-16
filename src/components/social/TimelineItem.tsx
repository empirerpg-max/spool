import Link from 'next/link';
import { KindTag } from '@/components/KindTag';
import { relativeTime } from '@/lib/format';
import type { Person, TimelineEntry } from '@/lib/social/types';
import { Avatar } from './Avatar';
import { PostCard } from './PostCard';
import { SpoilerReveal } from './SpoilerReveal';

const SNIPPET = 280;
const snippet = (text: string) => (text.length > SNIPPET ? `${text.slice(0, SNIPPET).trimEnd()}…` : text);

function Who({ person }: { person: Person }) {
  return <Link href={`/@${person.username}`} className="font-semibold hover:underline">@{person.username}</Link>;
}

/** One timeline entry: a post, a published review or a reply in a followed conversation. */
export function TimelineItem({ entry: e }: { entry: TimelineEntry }) {
  if (e.type === 'post') return <PostCard post={e.post} />;

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
