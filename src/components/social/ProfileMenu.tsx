'use client';

import { useState, useTransition } from 'react';
import { block, mute, unblock, unmute, type SocialActionState } from '@/lib/social/actions';

type Props = { targetId: string; username: string; path: string; muted: boolean; blocked: boolean };

export const blockQuestion = (username: string) =>
  `Bloquear @${username}? Vocês deixam de se seguir e não verão o que o outro publica.`;

/** "⋯" menu on someone else's profile: silence and block. */
export function ProfileMenu({ targetId, username, path, muted, blocked }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const go = (fn: (id: string, p: string) => Promise<SocialActionState>) =>
    startTransition(async () => {
      const r = await fn(targetId, path);
      setError(r.error ?? null);
    });

  const item = 'block w-full rounded px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-60';
  return (
    <details className="relative">
      <summary aria-label="Mais opções" className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-line-strong text-lg leading-none hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true">⋯</span>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-line bg-surface p-1 shadow-lg">
        <button type="button" disabled={pending} className={item} onClick={() => go(muted ? unmute : mute)}>
          {muted ? 'Deixar de silenciar' : 'Silenciar'}
        </button>
        {!muted && <p className="px-3 pb-2 text-xs text-muted">Some da sua timeline e dos seus avisos. A pessoa não é avisada.</p>}
        <button type="button" disabled={pending} className={`${item} text-danger`}
          onClick={() => {
            if (blocked) return go(unblock);
            if (window.confirm(blockQuestion(username))) go(block);
          }}>
          {blocked ? 'Desbloquear' : 'Bloquear'}
        </button>
        {error && <p role="alert" className="px-3 pb-2 text-xs text-danger">{error}</p>}
      </div>
    </details>
  );
}
