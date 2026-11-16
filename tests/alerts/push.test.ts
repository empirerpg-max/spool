import { describe, it, expect, vi } from 'vitest';
import { buildPushPayload, deliverPushes, type DeliveryDeps } from '@/lib/alerts/deliver';

describe('buildPushPayload', () => {
  it('carries title, body and the link to open', () => {
    expect(JSON.parse(buildPushPayload({ title: 'Matrix chegou na Max', body: null, url: '/obra/filme/603' })))
      .toEqual({ title: 'Matrix chegou na Max', body: '', url: '/obra/filme/603' });
  });
});

describe('deliverPushes', () => {
  const sub = (id: number, userId: string) => ({ id, userId, endpoint: `https://push.example/${id}`, p256dh: 'k', auth: 'a' });
  function deps(over: Partial<DeliveryDeps> = {}): DeliveryDeps {
    return {
      pending: vi.fn(async () => [
        { notificationId: 1, userId: 'ana', title: 'A', body: null, url: '/a' },
        { notificationId: 2, userId: 'bia', title: 'B', body: null, url: '/b' },
        { notificationId: 3, userId: 'cris', title: 'C', body: null, url: '/c' },
      ]),
      subscriptions: vi.fn(async () => [sub(10, 'ana'), sub(11, 'ana'), sub(20, 'bia')]),
      send: vi.fn(async () => {}),
      markPushed: vi.fn(async () => {}),
      removeSubscription: vi.fn(async () => {}),
      ...over,
    };
  }

  it('sends to every device of each person and marks all as handled', async () => {
    const d = deps();
    expect(await deliverPushes(d)).toEqual({ sent: 3, removed: 0 });
    expect(d.send).toHaveBeenCalledTimes(3);
    expect(d.markPushed).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('drops expired subscriptions and keeps going', async () => {
    const send = vi.fn(async (s: { id: number }) => {
      if (s.id === 10) throw Object.assign(new Error('gone'), { statusCode: 410 });
      if (s.id === 11) throw Object.assign(new Error('boom'), { statusCode: 500 });
    });
    const d = deps({ send });
    expect(await deliverPushes(d)).toEqual({ sent: 1, removed: 1 });
    expect(d.removeSubscription).toHaveBeenCalledWith(10);
    expect(d.markPushed).toHaveBeenCalledWith([1, 2, 3]);
  });

  it('does nothing when there is nothing pending', async () => {
    const d = deps({ pending: vi.fn(async () => []) });
    expect(await deliverPushes(d)).toEqual({ sent: 0, removed: 0 });
    expect(d.subscriptions).not.toHaveBeenCalled();
  });

  it('marks alerts as handled before sending, so a cut-off run never resends them', async () => {
    const order: string[] = [];
    const d = deps({
      markPushed: vi.fn(async () => { order.push('mark'); }),
      send: vi.fn(async () => { order.push('send'); }),
    });
    await deliverPushes(d);
    expect(order[0]).toBe('mark');
  });
});
