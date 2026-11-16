'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { ActionState } from '@/lib/community/actions';

export function ReplyForm({ action }: { action: (prev: ActionState, fd: FormData) => Promise<ActionState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={formAction} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Sua resposta</span>
        <textarea name="body" required maxLength={10000} rows={4} className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="hasSpoiler" />
        <span>Contém spoiler</span>
      </label>
      {(state.error || state.fieldErrors?.body) && <p role="alert" className="text-danger">{state.error ?? state.fieldErrors?.body}</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-fg px-4 py-2 font-semibold text-bg disabled:opacity-60">
        Responder
      </button>
    </form>
  );
}
