'use client';

import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(formData: FormData) {
    setStatus('sending');
    const email = String(formData.get('email') ?? '').trim();
    const { error } = await createBrowserSupabase().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setStatus(error ? 'error' : 'sent');
  }

  async function google() {
    await createBrowserSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      {googleEnabled && (
        <button type="button" onClick={google} className="w-full rounded-lg border border-line px-4 py-2 font-medium">
          Entrar com Google
        </button>
      )}
      <form action={sendLink} className="space-y-3">
        <label className="block space-y-1">
          <span className="text-sm">E-mail</span>
          <input name="email" type="email" required autoComplete="email" className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
        </label>
        <button type="submit" disabled={status === 'sending'} className="w-full rounded-lg bg-fg px-4 py-2 font-semibold text-bg disabled:opacity-60">
          Receber link de acesso
        </button>
      </form>
      {status === 'sent' && <p role="status">Enviamos um link para seu e-mail.</p>}
      {status === 'error' && <p role="alert" className="text-danger">Não foi possível enviar o link. Tente de novo em alguns minutos.</p>}
    </div>
  );
}
