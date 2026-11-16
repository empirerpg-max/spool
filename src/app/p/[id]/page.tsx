import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ReplyForm } from '@/components/community/ReplyForm';
import { ReportButton } from '@/components/community/ReportButton';
import { Avatar } from '@/components/social/Avatar';
import { DeletePostButton, DeleteReplyButton } from '@/components/social/DeleteButtons';
import { PostCard } from '@/components/social/PostCard';
import { SpoilerReveal } from '@/components/social/SpoilerReveal';
import { WatchButton } from '@/components/social/WatchButton';
import { getCurrentUser } from '@/lib/auth/current-user';
import { relativeTime } from '@/lib/format';
import { replyToPost } from '@/lib/social/actions';
import { getPost, listReplies } from '@/lib/social/post-queries';
import { REPLY_MAX } from '@/lib/social/limits';

type Params = Promise<{ id: string }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = { title: 'Publicação · Lobby' };

export default async function PostPage({ params, searchParams }: { params: Params; searchParams: Promise<{ pagina?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const user = await getCurrentUser();
  // Posts are for members only.
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/p/${id}`)}`);
  const post = await getPost(id);
  if (!post) notFound();
  const page = Math.max(1, Number(sp.pagina) || 1);
  const { replies, hasMore } = await listReplies(id, page);
  const path = `/p/${id}`;
  const canWrite = Boolean(user.username) && !user.banned;

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <PostCard post={post} />
      <div className="flex flex-wrap items-center gap-4">
        <WatchButton target="post" id={post.id} path={path} initialWatching={post.watching} />
        {post.isMine || user.isAdmin ? <DeletePostButton postId={post.id} /> : null}
        {!post.isMine && <ReportButton socialPostId={post.id} />}
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold">{post.replyCount === 1 ? '1 resposta' : `${post.replyCount} respostas`}</h2>
        {replies.length === 0 && page === 1 && <p className="text-muted">Ninguém respondeu ainda.</p>}
        <ul className="space-y-4">
          {replies.map((r) => (
            <li key={r.id} className="flex gap-3">
              <Avatar url={r.author.avatarUrl} name={r.author.displayName ?? r.author.username} size="sm" />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm">
                  {r.author.displayName && <span className="font-semibold">{r.author.displayName} </span>}
                  <Link href={`/@${r.author.username}`} className={r.author.displayName ? 'text-muted hover:underline' : 'font-semibold hover:underline'}>@{r.author.username}</Link>
                  <span className="text-muted"> · {relativeTime(r.createdAt)}</span>
                </p>
                {r.hasSpoiler ? (
                  <SpoilerReveal><p className="whitespace-pre-wrap break-words">{r.body}</p></SpoilerReveal>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{r.body}</p>
                )}
                <div className="flex items-center gap-3">
                  {r.isMine || user.isAdmin ? <DeleteReplyButton replyId={r.id} postId={post.id} /> : null}
                  {!r.isMine && <ReportButton socialReplyId={r.id} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex gap-4 text-sm">
          {page > 1 && <Link href={`${path}?pagina=${page - 1}`} className="underline">Respostas anteriores</Link>}
          {hasMore && <Link href={`${path}?pagina=${page + 1}`} className="underline">Mais respostas</Link>}
        </div>
      </section>

      {canWrite ? (
        <ReplyForm action={replyToPost.bind(null, post.id)} maxLength={REPLY_MAX} />
      ) : user.banned ? (
        <p className="text-danger">Sua conta está suspensa.</p>
      ) : (
        <Link href={`/bem-vindo?next=${encodeURIComponent(path)}`} className="underline">Escolha um nome de usuário para responder</Link>
      )}
    </article>
  );
}
