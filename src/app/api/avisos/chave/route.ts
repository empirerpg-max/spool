import { getVapidKeys } from '@/lib/alerts/push';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Public half of the notification keys, needed by the browser to subscribe. */
export async function GET() {
  const { publicKey } = await getVapidKeys(createServiceClient());
  return Response.json({ publicKey }, { headers: { 'cache-control': 'public, max-age=3600' } });
}
