import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth/current-user';
import { UserMenuView } from './UserMenuView';
import { Bell } from './alerts/Bell';

export async function UserMenu() {
  const [user, h] = await Promise.all([getCurrentUser(), headers()]);
  return (
    <div className="flex items-center gap-4">
      {user && <Bell />}
      <UserMenuView user={user} path={h.get('x-lobby-path') ?? '/'} />
    </div>
  );
}
