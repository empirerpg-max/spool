import 'server-only';
import { cache } from 'react';
import { createSessionClient } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/env';

export type CurrentUser = { id: string; username: string | null; isAdmin: boolean; banned: boolean };

/** The signed-in user with their profile, or null (signed out, or Supabase not configured). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!supabaseConfigured()) return null;
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from('profiles').select('username, is_admin, banned_at').eq('id', data.user.id).maybeSingle();
  return {
    id: data.user.id,
    username: profile?.username ?? null,
    isAdmin: profile?.is_admin ?? false,
    banned: Boolean(profile?.banned_at),
  };
});
