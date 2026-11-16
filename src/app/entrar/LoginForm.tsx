'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signIn, type AuthState } from '@/lib/auth/actions';

const field = 'w-full rounded-lg border border-line-strong bg-surface px-3 py-2';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  const err = state.fieldErrors ?? {};
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">E-mail</span>
          <input name="email" type="email" required autoComplete="email" className={field} />
          {err.email && <span role="alert" className="block text-sm text-danger">{err.email}</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Senha</span>
          <input name="password" type="password" required autoComplete="current-password" className={field} />
          {err.password && <span role="alert" className="block text-sm text-danger">{err.password}</span>}
        </label>
        {state.error && <p role="alert" className="text-danger">{state.error}</p>}
        <button type="submit" disabled={pending} className="w-full rounded-full bg-fg px-4 py-2.5 font-semibold text-bg disabled:opacity-60">
          Entrar
        </button>
      </form>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted hover:text-fg">Esqueci minha senha</summary>
        <p className="mt-2 text-muted">Peça para a equipe do Lobby redefinir sua senha.</p>
      </details>
      <p className="text-center text-sm text-muted">
        Ainda não tem conta? <Link href="/criar-conta" className="font-semibold text-fg underline">Criar conta</Link>
      </p>
    </div>
  );
}
