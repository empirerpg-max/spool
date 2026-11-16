'use client';

import { useState, useTransition } from 'react';
import { likePost, unlikePost } from '@/lib/social/actions';

const likes = (n: number) => (n === 1 ? '1 curtida' : `${n.toLocaleString('pt-BR')} curtidas`);

/** ♡ / ♥ with the count. Changes right away and undoes itself if the server refuses. */
export function LikeButton({ postId, initialLiked, initialCount }: { postId: string; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !liked;
    const delta = next ? 1 : -1;
    setError(null);
    setLiked(next);
    setCount((c) => Math.max(0, c + delta));
    startTransition(async () => {
      const r = await (next ? likePost : unlikePost)(postId);
      if (r.error) {
        setLiked(!next);
        setCount((c) => Math.max(0, c - delta));
        setError(r.error);
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={liked}
        aria-label={`${liked ? 'Descurtir' : 'Curtir'} (${likes(count)})`}
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm hover:bg-surface-2 ${liked ? 'text-film' : 'text-muted hover:text-fg'}`}>
        <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
        <span>{count.toLocaleString('pt-BR')}</span>
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  );
}
