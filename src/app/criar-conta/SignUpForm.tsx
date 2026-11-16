'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signUp, type AuthState } from '@/lib/auth/actions';

const field = 'w-full rounded-lg border border-line-strong bg-surface px-3 py-2';

function Field({ name, label, type = 'text', autoComplete, error, hint }: { name: string; label: string; type?: string; autoComplete?: string; error?: string; hint?: string }) {
  const id = `f-${name}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <input id={id} name={name} type={type} required autoComplete={autoComplete} className={field}
        aria-invalid={Boolean(error)} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <span id={`${id}-hint`} className="block text-xs text-muted">{hint}</span>}
      {error && <span role="alert" className="block text-sm text-danger">{error}</span>}
    </div>
  );
}

export function SignUpForm({ inviteRequired }: { inviteRequired: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const err = state.fieldErrors ?? {};
  if (state.needsConfirmation) {
    return <p role="status" className="mx-auto max-w-sm text-center">Conta criada! Confira seu e-mail para ativar a conta e depois entre.</p>;
  }
  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label="Nome" autoComplete="given-name" error={err.firstName} />
        <Field name="lastName" label="Sobrenome" autoComplete="family-name" error={err.lastName} />
      </div>
      <Field name="birthDate" label="Data de nascimento" type="date" autoComplete="bday" error={err.birthDate} hint="É preciso ter pelo menos 16 anos." />
      <Field name="email" label="E-mail" type="email" autoComplete="email" error={err.email} />
      <Field name="password" label="Senha" type="password" autoComplete="new-password" error={err.password} hint="Pelo menos 8 caracteres, com letras e números." />
      <Field name="confirmPassword" label="Confirmar senha" type="password" autoComplete="new-password" error={err.confirmPassword} />
      {inviteRequired && <Field name="inviteCode" label="Código de convite" autoComplete="off" error={err.inviteCode} hint="Por enquanto o Lobby é só para convidados." />}
      <div className="space-y-1">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="acceptTerms" required className="mt-1" aria-label="Li e aceito os Termos de Uso e a Política de Privacidade" />
          <span>
            Li e aceito os <Link href="/termos" target="_blank" className="underline">Termos de Uso</Link> e a{' '}
            <Link href="/privacidade" target="_blank" className="underline">Política de Privacidade</Link>.
          </span>
        </label>
        {err.acceptTerms && <span role="alert" className="block text-sm text-danger">{err.acceptTerms}</span>}
      </div>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-full bg-fg px-4 py-2.5 font-semibold text-bg disabled:opacity-60">
        Criar conta
      </button>
      <p className="text-center text-sm text-muted">Já tem conta? <Link href="/entrar" className="font-semibold text-fg underline">Entrar</Link></p>
    </form>
  );
}
