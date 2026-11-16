import 'server-only';
import { generateVAPIDKeys, sendNotification, setVapidDetails } from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deliverPushes, type PushSub } from './deliver';

const SUBJECT = 'https://spool-eta-eight.vercel.app';

/** VAPID keys are created once by the site itself and kept in a server-only table. */
export async function getVapidKeys(db: SupabaseClient): Promise<{ publicKey: string; privateKey: string }> {
  const read = async () => (await db.from('push_keys').select('public_key, private_key').maybeSingle()).data as { public_key: string; private_key: string } | null;
  let row = await read();
  if (!row) {
    const k = generateVAPIDKeys();
    await db.from('push_keys').upsert({ id: true, public_key: k.publicKey, private_key: k.privateKey }, { onConflict: 'id', ignoreDuplicates: true });
    row = await read();
  }
  if (!row) throw new Error('Não foi possível criar as chaves de aviso');
  return { publicKey: row.public_key, privateKey: row.private_key };
}

type PendingRow = { id: number; user_id: string; event: { title: string; body: string | null; url: string } | Array<{ title: string; body: string | null; url: string }> };

export async function sendPendingPushes(db: SupabaseClient): Promise<void> {
  const keys = await getVapidKeys(db);
  setVapidDetails(SUBJECT, keys.publicKey, keys.privateKey);
  await deliverPushes({
    pending: async () => {
      const { data } = await db.from('notifications').select('id, user_id, event:events(title, body, url)').is('pushed_at', null).order('created_at').limit(500);
      return ((data ?? []) as unknown as PendingRow[]).map((r) => {
        const e = Array.isArray(r.event) ? r.event[0] : r.event;
        return { notificationId: r.id, userId: r.user_id, title: e.title, body: e.body, url: e.url };
      });
    },
    subscriptions: async (userIds) => {
      const { data } = await db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', userIds);
      return (data ?? []).map((s): PushSub => ({ id: s.id, userId: s.user_id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }));
    },
    send: async (s, payload) => {
      await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86_400 });
    },
    markPushed: async (ids) => { await db.from('notifications').update({ pushed_at: new Date().toISOString() }).in('id', ids); },
    removeSubscription: async (id) => { await db.from('push_subscriptions').delete().eq('id', id); },
  });
}
