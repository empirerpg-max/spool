export type PendingPush = { notificationId: number; userId: string; title: string; body: string | null; url: string };
export type PushSub = { id: number; userId: string; endpoint: string; p256dh: string; auth: string };

export type DeliveryDeps = {
  pending: () => Promise<PendingPush[]>;
  subscriptions: (userIds: string[]) => Promise<PushSub[]>;
  send: (sub: PushSub, payload: string) => Promise<void>;
  markPushed: (notificationIds: number[]) => Promise<void>;
  removeSubscription: (id: number) => Promise<void>;
  now?: () => number;
};

const PARALLEL = 10;
const BUDGET_MS = 15_000;

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

  // Claim first: if this run is cut off mid-way, the next one won't send the same alerts again.
  await d.markPushed(pending.map((p) => p.notificationId));
  const subs = await d.subscriptions([...new Set(pending.map((p) => p.userId))]);
  const jobs = pending.flatMap((p) => subs.filter((s) => s.userId === p.userId).map((s) => ({ s, payload: buildPushPayload(p) })));

  let sent = 0;
  const removed = new Set<number>();
  const now = d.now ?? Date.now;
  const start = now();
  for (let i = 0; i < jobs.length; i += PARALLEL) {
    if (now() - start >= BUDGET_MS) break;
    await Promise.all(jobs.slice(i, i + PARALLEL).map(async ({ s, payload }) => {
      if (removed.has(s.id)) return;
      try {
        await d.send(s, payload);
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          if (!removed.has(s.id)) {
            removed.add(s.id);
            await d.removeSubscription(s.id);
          }
        } else {
          console.error('[alerts] push failed', status, (e as Error).message);
        }
      }
    }));
  }
  return { sent, removed: removed.size };
}
