'use server';

import { createSessionClient } from '@/lib/supabase/session';

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function savePushSubscription(sub: Sub): Promise<{ ok: boolean }> {
  if (!/^https:\/\//.test(sub?.endpoint ?? '') || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  const supabase = await createSessionClient();
  // The database checks the push service, the 10-device limit, and moves a shared device to this account.
  const { error } = await supabase.rpc('claim_push_subscription', { p_endpoint: sub.endpoint, p_p256dh: sub.keys.p256dh, p_auth: sub.keys.auth });
  if (error) console.error('[alerts] subscribe failed', error.message);
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
