'use client';

import { useActionState } from 'react';
import { chooseUsername } from './actions';

type Props = {
  next: string; current: string | null;
  /** Earlier answer to "show my activity"; never answered (new members) starts checked. */
  shareActivity: boolean | null;
};

export function UsernameForm({ next, current, shareActivity }: Props) {
  const [state, action, pending] = useActionState(chooseUsername, {});
  return (
    <form action={action} className="mx-auto max-w-sm space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1">
        <span className="text-sm">Nome de usuário</span>
        <div className="flex items-center gap-1">
          <span className="text-muted">@</span>
          <input name="username" defaultValue={current ?? ''} required minLength={3} maxLength={20} autoComplete="username"
            className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
        </div>
        <span className="text-xs text-muted">3 a 20 letras minúsculas, números ou _</span>
      </label>
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="shareActivity" defaultChecked={shareActivity ?? true} aria-describedby="share-activity-help" />
          <span>Mostrar minha atividade para quem me segue</span>
        </label>
        <p id="share-activity-help" className="ml-6 text-xs text-muted">Quem te segue vê quando você marca algo como Quero ver, Vendo ou Visto.</p>
      </div>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-fg px-4 py-2 font-semibold text-bg disabled:opacity-60">
        Salvar
      </button>
    </form>
  );
}
