import Link from 'next/link';
import type { SocialPost } from '@/lib/social/types';
import { PostCard } from './PostCard';

type Props = { posts: SocialPost[]; isMe: boolean; base: string; page: number; hasMore: boolean };

/** "Publicações" tab of a profile: the person's posts, newest first, 20 per page. */
export function ProfilePosts({ posts, isMe, base, page, hasMore }: Props) {
  return (
    <div className="space-y-4">
      {isMe && (
        <Link href="/publicar" className="inline-block rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg">Nova publicação</Link>
      )}
      {posts.length === 0 && page === 1 ? (
        <p className="text-muted">{isMe ? 'Você ainda não publicou nada.' : 'Nenhuma publicação ainda.'}</p>
      ) : (
        <ul className="max-w-2xl space-y-4">
          {posts.map((p) => <li key={p.id}><PostCard post={p} /></li>)}
        </ul>
      )}
      <div className="flex gap-4 text-sm">
        {page > 1 && <Link href={page === 2 ? base : `${base}?pagina=${page - 1}`} className="underline">Mais recentes</Link>}
        {hasMore && <Link href={`${base}?pagina=${page + 1}`} className="underline">Mais antigas</Link>}
      </div>
    </div>
  );
}
