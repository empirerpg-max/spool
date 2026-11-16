import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createSessionClient } from '@/lib/supabase/session';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata: Metadata = { title: 'Minha conta · Lobby' };

export default async function MyAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=%2Fminha-conta');
  const supabase = await createSessionClient();
  const [{ data: auth }, { data: rows }] = await Promise.all([supabase.auth.getUser(), supabase.rpc('my_profile')]);
  const me = (rows as Array<{ first_name: string | null; last_name: string | null }> | null)?.[0];

  return (
    <section className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold">Minha conta</h1>
      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="text-muted">Nome</dt><dd>{[me?.first_name, me?.last_name].filter(Boolean).join(' ') || '—'}</dd>
        <dt className="text-muted">E-mail</dt><dd className="break-all">{auth.user?.email}</dd>
        <dt className="text-muted">Usuário</dt><dd>{user.username ? `@${user.username}` : <Link href="/bem-vindo" className="underline">Escolher nome de usuário</Link>}</dd>
      </dl>
      <div className="space-y-3">
        <h2 className="font-display text-xl font-bold">Trocar senha</h2>
        <ChangePasswordForm />
      </div>
      <p className="text-sm text-muted">Só você vê seu nome e seu e-mail. Para os outros, aparece apenas o seu @.</p>
    </section>
  );
}
