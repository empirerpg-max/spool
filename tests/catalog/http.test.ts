import { afterEach, describe, it, expect, vi } from 'vitest';
import { getJson } from '@/lib/catalog/http';
import { fakeFetch } from './clients.helpers';

afterEach(() => { vi.restoreAllMocks(); });

describe('getJson timeout', () => {
  it('waits 8 seconds by default (interactive search)', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    await getJson('https://x.test/a', 'books', {}, fakeFetch([{ match: /x\.test/, body: {} }]));
    expect(timeout).toHaveBeenCalledWith(8_000);
  });

  it('can wait longer for slow lists', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    await getJson('https://x.test/a', 'books', {}, fakeFetch([{ match: /x\.test/, body: {} }]), { timeoutMs: 15_000 });
    expect(timeout).toHaveBeenCalledWith(15_000);
  });
});
