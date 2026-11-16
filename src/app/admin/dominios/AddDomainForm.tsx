'use client';

import { useActionState } from 'react';
import { addBlockedDomain } from '@/lib/admin/actions';

export function AddDomainForm() {
  const [state, action, pending] = useActionState(addBlockedDomain, {});
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input name="domain" required placeholder="exemplo.com" className="rounded-lg border border-line-strong bg-surface px-3 py-2" />
      <button type="submit" disabled={pending} className="rounded-lg bg-fg px-4 py-2 font-semibold text-bg disabled:opacity-60">Adicionar domínio</button>
      {state.error && <p role="alert" className="w-full text-danger">{state.error}</p>}
    </form>
  );
}
