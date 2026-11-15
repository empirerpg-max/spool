import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/current-user';

/** Signed out → sign in; signed in but not admin → 404 (the admin area doesn't advertise itself). */
export async function requireAdmin(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  if (!user.isAdmin) notFound();
  return user;
}
