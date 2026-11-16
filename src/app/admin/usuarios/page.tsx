import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/AdminNav';
import { requireAdmin } from '@/lib/admin/guard';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = { title: 'Usuários · Admin · Lobby' };

export default async function UsersPage() {
  await requireAdmin('/admin/usuarios');
  return (
    <section className="space-y-6">
      <AdminNav current="/admin/usuarios" />
      <h1 className="font-display text-3xl font-extrabold">Usuários</h1>
      <p className="max-w-prose text-muted">Enquanto o Lobby não envia e-mails, quem esquecer a senha pede para a administração. Gere uma senha temporária e passe para a pessoa.</p>
      <ResetPasswordForm />
    </section>
  );
}
