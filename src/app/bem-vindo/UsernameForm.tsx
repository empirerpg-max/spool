'use client';

import { useActionState } from 'react';
import { chooseUsername } from './actions';

export function UsernameForm({ next, current }: { next: string; current: string | null }) {
  const [state, action, pending] = useActionState(chooseUsername, {});
  return (
    <form action={action} className="mx-auto max-w-sm space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1">
        <span className="text-sm">Nome de usuário</span>
        <div className="flex items-center gap-1">
          <span className="text-neutral-500">@</span>
          <input name="username" defaultValue={current ?? ''} required minLength={3} maxLength={20} autoComplete="username"
            className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
        </div>
        <span className="text-xs text-neutral-500">3 a 20 letras minúsculas, números ou _</span>
      </label>
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">
        Salvar
      </button>
    </form>
  );
}
