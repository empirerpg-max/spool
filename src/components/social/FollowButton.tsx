'use client';

import { useState, useTransition } from 'react';
import { follow, unfollow } from '@/lib/social/actions';

type Props = { targetId: string; path: string; initialFollowing: boolean; size?: 'sm' | 'md' };

/** "Seguir" / "Seguindo" (shows "Deixar de seguir" on hover or focus). */
export function FollowButton({ targetId, path, initialFollowing, size = 'md' }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [hover, setHover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !following;
    setError(null);
    setFollowing(next);
    startTransition(async () => {
      const r = await (next ? follow : unfollow)(targetId, path);
      if (r.error) {
        setFollowing(!next);
        setError(r.error);
      }
    });
  }

  const pad = size === 'sm' ? 'px-3 py-1 text-sm' : 'px-5 py-2';
  const look = following
    ? `border border-line-strong ${hover ? 'text-danger' : ''}`
    : 'bg-fg text-bg';
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={following}
        title={following ? 'Deixar de seguir' : undefined}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)} onBlur={() => setHover(false)}
        className={`min-w-28 rounded-full font-semibold disabled:opacity-60 ${pad} ${look}`}>
        {following ? (hover ? 'Deixar de seguir' : 'Seguindo') : 'Seguir'}
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  );
}
