'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Avatar } from '@/components/social/Avatar';
import { unblock, unmute } from '@/lib/social/actions';
import type { PersonSummary } from '@/lib/social/queries';

function PeopleList({ people, empty, actionLabel, onAction }: {
  people: PersonSummary[]; empty: string; actionLabel: string; onAction: (id: string) => Promise<{ error?: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (people.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <>
      <ul className="max-w-md divide-y divide-line">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <Avatar url={p.avatarUrl} name={p.displayName ?? p.username} size="sm" />
            <Link href={`/@${p.username}`} className="min-w-0 flex-1 truncate">
              {p.displayName && <span className="font-medium">{p.displayName} </span>}
              <span className="text-muted">@{p.username}</span>
            </Link>
            <button type="button" disabled={pending} className="rounded-full border border-line-strong px-3 py-1 text-sm hover:bg-surface-2 disabled:opacity-60"
              onClick={() => startTransition(async () => { const r = await onAction(p.id); setError(r.error ?? null); })}>
              {actionLabel}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </>
  );
}

export function BlockedMutedList({ blocked, muted }: { blocked: PersonSummary[]; muted: PersonSummary[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-2">
        <h3 className="font-semibold">Bloqueados</h3>
        <PeopleList people={blocked} empty="Você não bloqueou ninguém." actionLabel="Desbloquear" onAction={(id) => unblock(id, '/minha-conta')} />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">Silenciados</h3>
        <PeopleList people={muted} empty="Você não silenciou ninguém." actionLabel="Deixar de silenciar" onAction={(id) => unmute(id, '/minha-conta')} />
      </div>
    </div>
  );
}
