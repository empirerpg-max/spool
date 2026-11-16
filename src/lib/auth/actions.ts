'use server';

import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/supabase/session';
import { safeNextPath } from './redirect';
import { makeSignUpSchema, signInSchema, TERMS_VERSION, todaySaoPaulo } from './signup-schema';

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; needsConfirmation?: boolean };

const firstErrors = (issues: Array<{ path: PropertyKey[]; message: string }>) => {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message;
  return out;
};

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues) };
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  // Same message for unknown e-mail and wrong password: don't reveal which accounts exist.
  if (error || !data.user) return { error: 'E-mail ou senha incorretos' };
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', data.user.id).maybeSingle();
  const next = safeNextPath(String(formData.get('next') ?? ''));
  redirect(profile?.username ? next : `/bem-vindo?next=${encodeURIComponent(next)}`);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = makeSignUpSchema(todaySaoPaulo()).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error.issues) };
  const v = parsed.data;

  const supabase = await createSessionClient();
  // Friendly pre-check; the database enforces the same rule when the account is created.
  const { data: ok } = await supabase.rpc('invite_is_valid', { p_code: v.inviteCode });
  if (!ok) return { fieldErrors: { inviteCode: 'Convite inválido ou já usado' } };

  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      data: { first_name: v.firstName, last_name: v.lastName, birth_date: v.birthDate, terms_version: TERMS_VERSION, invite_code: v.inviteCode },
    },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) return { fieldErrors: { email: 'Já existe uma conta com esse e-mail' } };
    return { error: 'Não foi possível criar a conta. Confira o convite e a data de nascimento.' };
  }
  if (!data.session) return { needsConfirmation: true };
  redirect('/bem-vindo');
}
