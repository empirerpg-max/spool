import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getProfileByUsername } from '@/lib/social/queries';

export function handleOf(raw: string): string {
  let s = raw;
  try { s = decodeURIComponent(raw); } catch { /* keep as typed */ }
  return s.replace(/^@/, '').trim().toLowerCase();
}

/**
 * Profiles are for members only: signed out → sign in and come back; missing or blocked by them → 404.
 * `suffix` is the subpage ("/seguidores") so sign-in returns to the right place.
 */
export const loadProfile = cache(async (raw: string, suffix = '') => {
  const handle = handleOf(raw);
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/@${handle}${suffix}`)}`);
  const profile = await getProfileByUsername(handle);
  if (!profile) notFound();
  return profile;
});
