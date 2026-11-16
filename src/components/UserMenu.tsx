import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/current-user';
import { UserMenuView } from './UserMenuView';

export async function UserMenu() {
  const [user, h] = await Promise.all([getCurrentUser(), headers()]);
  return <UserMenuView user={user} path={h.get('x-lobby-path') ?? '/'} />;
}
