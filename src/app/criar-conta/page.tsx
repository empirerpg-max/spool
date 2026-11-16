import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';
import { SignUpForm } from './SignUpForm';

export const metadata: Metadata = { title: 'Criar conta · Lobby' };

export default async function SignUpPage() {
  if (!supabaseConfigured()) return <p className="py-16 text-center text-warn">Cadastro indisponível no momento.</p>;
  if (await getCurrentUser()) redirect('/');
  // While there is no administrator yet, the first account is created without an invite.
  const supabase = await createSessionClient();
  const { data: open } = await supabase.rpc('invite_is_valid', { p_code: '' });
  return (
    <section className="space-y-6 py-8">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-extrabold">Criar conta</h1>
        <p className="text-muted">{open ? 'Você é a primeira pessoa: sua conta será a de administração.' : 'Use o código de convite que você recebeu.'}</p>
      </div>
      <SignUpForm inviteRequired={!open} />
    </section>
  );
}
