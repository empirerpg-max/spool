import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/lib/alerts/run', () => ({ runDailyJob: vi.fn(async () => ({ processed: 2, events: 1, remaining: 0 })) }));
import { POST } from '@/app/api/tarefas/diaria/route';

const call = (auth?: string) => POST(new Request('https://x/api/tarefas/diaria', { method: 'POST', headers: auth ? { authorization: auth } : {} }));

describe('daily job route', () => {
  const saved = process.env.CRON_SECRET;
  afterEach(() => { process.env.CRON_SECRET = saved; });

  it('refuses without the secret', async () => {
    process.env.CRON_SECRET = 's3cret-value';
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    expect((await call('Bearer s3cret-valuX')).status).toBe(401);
  });
  it('is unavailable when no secret is configured', async () => {
    delete process.env.CRON_SECRET;
    expect((await call('Bearer anything')).status).toBe(503);
  });
  it('runs with the right secret', async () => {
    process.env.CRON_SECRET = 's3cret-value';
    const res = await call('Bearer s3cret-value');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 2, events: 1, remaining: 0 });
  });
});
