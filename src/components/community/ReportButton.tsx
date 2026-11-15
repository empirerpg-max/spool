'use client';

import { useActionState } from 'react';
import { reportContent, type ActionState } from '@/lib/community/actions';

const REASONS: Array<[string, string]> = [
  ['spoiler', 'Spoiler sem aviso'],
  ['ofensa', 'Ofensa'],
  ['spam', 'Spam'],
  ['pirataria', 'Pirataria'],
  ['outro', 'Outro'],
];

export function ReportButton({ topicId, postId }: { topicId?: string; postId?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reportContent, {});
  if (state.ok) return <p role="status" className="text-xs text-neutral-500">Denúncia enviada. Obrigado!</p>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-neutral-500 hover:underline">Denunciar</summary>
      <form action={action} className="mt-2 space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        {topicId && <input type="hidden" name="topicId" value={topicId} />}
        {postId && <input type="hidden" name="postId" value={postId} />}
        {REASONS.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input type="radio" name="reason" value={value} required />
            {label}
          </label>
        ))}
        <textarea name="note" maxLength={500} rows={2} placeholder="Detalhes (opcional)" className="w-full rounded border border-neutral-300 bg-transparent px-2 py-1 dark:border-neutral-700" />
        {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
        <button type="submit" disabled={pending} className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-60">Denunciar</button>
      </form>
    </details>
  );
}
