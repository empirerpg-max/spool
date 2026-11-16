'use client';

import { useActionState } from 'react';
import { changeMyPassword, type ChangePasswordState } from '@/lib/admin/accounts';

const field = 'w-full rounded-lg border border-line-strong bg-surface px-3 py-2';

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changeMyPassword, {});
  return (
    <form action={action} className="max-w-sm space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Nova senha</span>
        <input name="password" type="password" required autoComplete="new-password" className={field} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Confirmar nova senha</span>
        <input name="confirmPassword" type="password" required autoComplete="new-password" className={field} />
      </label>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="text-success">Senha trocada!</p>}
      <button type="submit" disabled={pending} className="rounded-full bg-fg px-5 py-2 font-semibold text-bg disabled:opacity-60">Trocar senha</button>
    </form>
  );
}
