'use client';

import { useActionState } from 'react';
import { resetPassword, type ResetState } from '@/lib/admin/accounts';

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, {});
  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">E-mail da conta</span>
          <input name="email" type="email" required className="rounded-lg border border-line-strong bg-surface px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="rounded-full bg-fg px-5 py-2 font-semibold text-bg disabled:opacity-60">Gerar senha temporária</button>
      </form>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      {state.password && (
        <div role="status" className="space-y-2 rounded-xl border border-warn bg-surface p-4">
          <p>Nova senha de <strong>{state.email}</strong>:</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-warn">{state.password}</p>
          <p className="text-sm text-muted">Passe esta senha para a pessoa e peça para trocá-la em “Minha conta”. Ela não será mostrada de novo.</p>
        </div>
      )}
    </div>
  );
}
