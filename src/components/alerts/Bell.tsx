import { unreadCount } from '@/lib/alerts/queries';
import { BellView } from './BellView';

export async function Bell() {
  return <BellView count={await unreadCount().catch(() => 0)} />;
}
