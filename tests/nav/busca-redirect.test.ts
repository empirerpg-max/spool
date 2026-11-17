import { describe, it, expect, vi, beforeEach } from 'vitest';

const redirect = vi.hoisted(() => vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }));
vi.mock('next/navigation', () => ({ redirect }));

import SearchPage from '@/app/busca/page';

const go = (q?: string) => SearchPage({ searchParams: Promise.resolve(q === undefined ? {} : { q }) });

beforeEach(() => { redirect.mockClear(); });

describe('/busca', () => {
  it('opens Explorar with the same search, encoded', async () => {
    await expect(go('Ação & aventura')).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith('/explorar?q=A%C3%A7%C3%A3o%20%26%20aventura');
  });
  it('without a search, opens Explorar', async () => {
    await expect(go()).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith('/explorar');
    await expect(go('   ')).rejects.toThrow();
    expect(redirect).toHaveBeenLastCalledWith('/explorar');
  });
});
