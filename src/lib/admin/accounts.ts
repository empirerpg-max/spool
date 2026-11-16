'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/current-user';
import { createServiceClient } from '@/lib/supabase/server';
import { createSessionClient } from '@/lib/supabase/session';
import { temporaryPassword } from './temporary-password';

export type InviteState = { code?: string; error?: string };
export type ResetState = { password?: string; email?: string; error?: string };
export type ChangePasswordState = { ok?: boolean; error?: string };

const PASSWORD_RULE = 'A senha precisa ter pelo menos 8 caracteres, com letras e números';
const newPassword = z.string().min(8, PASSWORD_RULE).regex(/[A-Za-zÀ-ÿ]/, PASSWORD_RULE).regex(/\d/, PASSWORD_RULE).max(72, 'Senha muito longa');

export async function createInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const note = String(formData.get('note') ?? '').trim().slice(0, 100);
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc('create_invite', { p_note: note });
  if (error) return { error: 'Não foi possível gerar o convite.' };
  revalidatePath('/admin/convites');
  return { code: data as string };
}

/** Admin-only: sets a temporary password, since password e-mails need our own domain. */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const me = await getCurrentUser();
  if (!me?.isAdmin) return { error: 'Só a administração pode fazer isso.' };
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email.includes('@')) return { error: 'Informe o e-mail da conta.' };

  const admin = createServiceClient();
  const PER_PAGE = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) return { error: 'Não foi possível buscar as contas.' };
    const user = data.users.find((u) => u.email?.toLowerCase() === email);
    if (user) {
      const { data: target } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      if (target?.is_admin) return { error: 'A senha de outra pessoa da administração não pode ser trocada por aqui.' };
      const password = temporaryPassword();
      const { error: upErr } = await admin.auth.admin.updateUserById(user.id, { password });
      if (upErr) return { error: 'Não foi possível trocar a senha.' };
      // Whoever was signed in with the old password (maybe an intruder) is signed out everywhere.
      const { error: endErr } = await admin.rpc('end_sessions', { p_user: user.id });
      if (endErr) console.error('[admin] end_sessions failed', endErr.message);
      return { password, email };
    }
    if (data.users.length < PER_PAGE) return { error: 'Nenhuma conta com esse e-mail.' };
  }
}

export async function changeMyPassword(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const password = newPassword.safeParse(String(formData.get('password') ?? ''));
  if (!password.success) return { error: password.error.issues[0].message };
  if (password.data !== String(formData.get('confirmPassword') ?? '')) return { error: 'As senhas não são iguais' };
  const supabase = await createSessionClient();
  // Confirm it's really the owner (not someone using an open session) before changing the password.
  const { data: me } = await supabase.auth.getUser();
  if (!me.user?.email) return { error: 'Entre de novo para trocar a senha.' };
  const { error: checkErr } = await supabase.auth.signInWithPassword({ email: me.user.email, password: String(formData.get('currentPassword') ?? '') });
  if (checkErr) return { error: 'Senha atual incorreta' };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: 'Não foi possível trocar a senha. Tente de novo.' };
  return { ok: true };
}
