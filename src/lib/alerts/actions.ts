'use server';

import { createSessionClient } from '@/lib/supabase/session';

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function savePushSubscription(sub: Sub): Promise<{ ok: boolean }> {
  if (!/^https:\/\//.test(sub?.endpoint ?? '') || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  const supabase = await createSessionClient();
  const { error } = await supabase.from('push_subscriptions').insert({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
  // Same device subscribing again: already saved.
  return { ok: !error || error.code === '23505' };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}
