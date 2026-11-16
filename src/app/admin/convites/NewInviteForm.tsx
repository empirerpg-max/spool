'use client';

import { useActionState, useState } from 'react';
import { createInvite, type InviteState } from '@/lib/admin/accounts';

export function NewInviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, {});
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Para quem é (opcional)</span>
          <input name="note" maxLength={100} className="rounded-lg border border-line-strong bg-surface px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="rounded-full bg-fg px-5 py-2 font-semibold text-bg disabled:opacity-60">Gerar convite</button>
      </form>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      {state.code && (
        <div role="status" className="flex flex-wrap items-center gap-4 rounded-xl border border-livro bg-surface p-4">
          <span className="font-mono text-3xl font-bold tracking-[0.2em] text-livro">{state.code}</span>
          <button
            type="button"
            className="rounded-full border border-line-strong px-4 py-1.5 text-sm"
            onClick={() => navigator.clipboard?.writeText(state.code!).then(() => setCopied(true), () => setCopied(false))}
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <span className="text-sm text-muted">Mande este código para a pessoa. Ele vale para uma conta só.</span>
        </div>
      )}
    </div>
  );
}
