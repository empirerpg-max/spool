import { connection } from 'next/server';
import { unreadCount } from '@/lib/alerts/queries';
import { getCurrentUser } from '@/lib/auth/current-user';
import { getOwnProfile } from '@/lib/social/queries';
import { NavBar } from './NavBar';

/** Reads who is signed in (photo and unread alerts too) and hands it to the navigation bar. */
export async function SiteNav() {
  // Always per request (as the old header was): never bake a signed-out bar into a page at build time.
  await connection();
  const user = await getCurrentUser();
  if (!user) return <NavBar user={null} unread={0} />;
  const [own, unread] = await Promise.all([
    getOwnProfile(user.id).catch(() => null),
    unreadCount().catch(() => 0),
  ]);
  return (
    <NavBar unread={unread}
      user={{ username: user.username, avatarUrl: own?.avatarUrl ?? null, isAdmin: user.isAdmin, banned: user.banned }} />
  );
}
