'use client';

import { useState, useTransition } from 'react';
import { unblock } from '@/lib/social/actions';

export function UnblockButton({ targetId, path }: { targetId: string; path: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={pending} className="rounded-full border border-line-strong px-5 py-2 font-semibold hover:bg-surface-2 disabled:opacity-60"
        onClick={() => startTransition(async () => { const r = await unblock(targetId, path); setError(r.error ?? null); })}>
        Desbloquear
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  );
}
