'use client';

import { useState, useTransition } from 'react';
import { unwatch, watch, type WatchTarget } from '@/lib/social/actions';

type Props = { target: WatchTarget; id: string; path: string; initialWatching: boolean };

/** "Acompanhar" / "Acompanhando": new replies in this conversation go to the bell and the timeline. */
export function WatchButton({ target, id, path, initialWatching }: Props) {
  const [watching, setWatching] = useState(initialWatching);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !watching;
    setError(null);
    setWatching(next);
    startTransition(async () => {
      const r = await (next ? watch : unwatch)(target, id, path);
      if (r.error) {
        setWatching(!next);
        setError(r.error);
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={toggle} disabled={pending} aria-pressed={watching}
        title={watching ? 'Clique para deixar de acompanhar' : 'Receba um aviso quando alguém responder'}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60 ${watching ? 'border border-line-strong hover:bg-surface-2' : 'bg-fg text-bg'}`}>
        {watching ? 'Acompanhando' : 'Acompanhar'}
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  );
}
