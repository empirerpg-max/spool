import Link from 'next/link';
import type { SocialPost } from '@/lib/social/types';
import { PostCard } from './PostCard';

type Props = { workId: string; workPath: string; signedIn: boolean; posts: SocialPost[]; hasMore: boolean; page: number };

/** "Publicações" of a work's community: members' posts about this work (members only). */
export function WorkPosts({ workId, workPath, signedIn, posts, hasMore, page }: Props) {
  return (
    <section id="publicacoes" className="scroll-mt-32 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Publicações</h2>
        {signedIn && (
          <Link href={`/publicar?obra=${workId}`} className="rounded-full border border-line-strong px-4 py-1.5 text-sm font-semibold hover:bg-surface-2">
            Publicar sobre esta obra
          </Link>
        )}
      </div>
      {!signedIn ? (
        <Link href={`/entrar?next=${encodeURIComponent(workPath)}`} className="text-muted underline hover:text-fg">
          Entre para ver as publicações dos membros
        </Link>
      ) : posts.length === 0 ? (
        <p className="text-muted">Ninguém publicou sobre esta obra ainda.</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => <li key={p.id}><PostCard post={p} /></li>)}
        </ul>
      )}
      {signedIn && hasMore && <Link href={`${workPath}?publicacoes=${page + 1}#publicacoes`} className="text-sm underline">Mais publicações</Link>}
    </section>
  );
}
