'use client';

import { useActionState } from 'react';
import { addBlockedDomain } from '@/lib/admin/actions';

export function AddDomainForm() {
  const [state, action, pending] = useActionState(addBlockedDomain, {});
  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input name="domain" required placeholder="exemplo.com" className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
      <button type="submit" disabled={pending} className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">Adicionar domínio</button>
      {state.error && <p role="alert" className="w-full text-red-600">{state.error}</p>}
    </form>
  );
}
