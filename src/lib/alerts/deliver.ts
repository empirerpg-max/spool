export type PendingPush = { notificationId: number; userId: string; title: string; body: string | null; url: string };
export type PushSub = { id: number; userId: string; endpoint: string; p256dh: string; auth: string };

export type DeliveryDeps = {
  pending: () => Promise<PendingPush[]>;
  subscriptions: (userIds: string[]) => Promise<PushSub[]>;
  send: (sub: PushSub, payload: string) => Promise<void>;
  markPushed: (notificationIds: number[]) => Promise<void>;
  removeSubscription: (id: number) => Promise<void>;
};

export function buildPushPayload(n: { title: string; body: string | null; url: string }): string {
  return JSON.stringify({ title: n.title, body: n.body ?? '', url: n.url });
}

/**
 * Sends each pending alert to every device of its person. Expired devices (404/410) are removed;
 * other failures are logged. Every pending alert is marked handled so nothing is sent twice.
 */
export async function deliverPushes(d: DeliveryDeps): Promise<{ sent: number; removed: number }> {
  const pending = await d.pending();
  if (pending.length === 0) return { sent: 0, removed: 0 };

  const subs = await d.subscriptions([...new Set(pending.map((p) => p.userId))]);
  let sent = 0;
  const removed = new Set<number>();
  for (const p of pending) {
    for (const s of subs.filter((x) => x.userId === p.userId && !removed.has(x.id))) {
      try {
        await d.send(s, buildPushPayload(p));
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await d.removeSubscription(s.id);
          removed.add(s.id);
        } else {
          console.error('[alerts] push failed', status, (e as Error).message);
        }
      }
    }
  }
  await d.markPushed(pending.map((p) => p.notificationId));
  return { sent, removed: removed.size };
}
