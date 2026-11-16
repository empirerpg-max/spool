'use client';

import { useActionState } from 'react';
import { reportContent, type ActionState } from '@/lib/community/actions';
import { reportSocial } from '@/lib/social/actions';

const REASONS: Array<[string, string]> = [
  ['spoiler', 'Spoiler sem aviso'],
  ['ofensa', 'Ofensa'],
  ['spam', 'Spam'],
  ['pirataria', 'Pirataria'],
  ['outro', 'Outro'],
];

type Target = { topicId?: string; postId?: string; socialPostId?: string; socialReplyId?: string };

/** "Denunciar" for a community topic or reply, or a member's post or reply to a post. */
export function ReportButton({ topicId, postId, socialPostId, socialReplyId }: Target) {
  const social = Boolean(socialPostId || socialReplyId);
  const [state, action, pending] = useActionState<ActionState, FormData>(social ? reportSocial : reportContent, {});
  if (state.ok) return <p role="status" className="text-xs text-muted">Denúncia enviada. Obrigado!</p>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted hover:underline">Denunciar</summary>
      <form action={action} className="mt-2 space-y-2 rounded-lg border border-line p-3">
        {topicId && <input type="hidden" name="topicId" value={topicId} />}
        {postId && <input type="hidden" name="postId" value={postId} />}
        {socialPostId && <input type="hidden" name="socialPostId" value={socialPostId} />}
        {socialReplyId && <input type="hidden" name="socialReplyId" value={socialReplyId} />}
        {REASONS.map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input type="radio" name="reason" value={value} required />
            {label}
          </label>
        ))}
        <textarea name="note" maxLength={500} rows={2} placeholder="Detalhes (opcional)" className="w-full rounded border border-line-strong bg-surface px-2 py-1" />
        {state.error && <p role="alert" className="text-danger">{state.error}</p>}
        <button type="submit" disabled={pending} className="rounded bg-danger px-3 py-1 font-semibold text-bg disabled:opacity-60">Denunciar</button>
      </form>
    </details>
  );
}
