import Link from 'next/link';
import { relativeTime } from '@/lib/format';
import type { SocialPost } from '@/lib/social/types';
import { Avatar } from './Avatar';
import { LikeButton } from './LikeButton';
import { SpoilerReveal } from './SpoilerReveal';
import { WorkChip } from './WorkChip';

const replies = (n: number) => (n === 1 ? '1 resposta' : `${n.toLocaleString('pt-BR')} respostas`);

/** A post: who, when, which work, the caption (hidden if spoiler), likes and replies. */
export function PostCard({ post: p }: { post: SocialPost }) {
  const href = `/p/${p.id}`;
  const caption = <p className="whitespace-pre-wrap break-words">{p.caption}</p>;
  return (
    <article className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <header className="flex items-center gap-3">
        <Avatar url={p.author.avatarUrl} name={p.author.displayName ?? p.author.username} size="sm" />
        <p className="min-w-0 flex-1 truncate text-sm">
          {p.author.displayName && <span className="font-semibold">{p.author.displayName}</span>}{' '}
          <Link href={`/@${p.author.username}`} className={p.author.displayName ? 'text-muted hover:underline' : 'font-semibold hover:underline'}>@{p.author.username}</Link>
          <span className="text-muted"> · </span>
          <Link href={href} className="text-muted hover:underline">{relativeTime(p.createdAt)}</Link>
        </p>
      </header>
      <WorkChip work={p.work} />
      {p.hasSpoiler ? <SpoilerReveal>{caption}</SpoilerReveal> : caption}
      <footer className="flex items-center gap-4">
        <LikeButton postId={p.id} initialLiked={p.likedByMe} initialCount={p.likeCount} />
        <Link href={href} aria-label={replies(p.replyCount)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-fg">
          <span aria-hidden="true">💬</span>
          <span>{p.replyCount.toLocaleString('pt-BR')}</span>
        </Link>
      </footer>
    </article>
  );
}
