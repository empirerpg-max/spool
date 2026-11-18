'use server';

import { redirect } from 'next/navigation';
import { usernameSchema } from '@/lib/auth/username';
import { safeNextPath } from '@/lib/auth/redirect';
import { createSessionClient } from '@/lib/supabase/session';

export async function chooseUsername(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const parsed = usernameSchema.safeParse(String(formData.get('username') ?? ''));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/entrar');

  const { error } = await supabase.from('profiles').update({ username: parsed.data }).eq('id', data.user.id);
  if (error?.code === '23505') return { error: 'Esse nome já está em uso' };
  if (error) return { error: 'Não foi possível salvar. Tente de novo.' };
  // The @ is what this page is for: if the activity choice fails to save, it can still be set in Minha conta.
  const share = formData.get('shareActivity') === 'on';
  const { error: shareErr } = await supabase.from('profile_details').update({ share_activity: share }).eq('id', data.user.id);
  if (shareErr) console.error('[bem-vindo] share_activity not saved', shareErr.message);
  redirect(safeNextPath(String(formData.get('next') ?? '')));
}
