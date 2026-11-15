import { describe, it, expect, vi } from 'vitest';
import { getOrFetchWork, needsRefresh } from '@/lib/catalog/get-work';
import type { WorkRepository } from '@/lib/catalog/repository';
import { CatalogUnavailableError, WorkNotFoundError } from '@/lib/catalog/errors';
import type { NormalizedWork, WorkKind } from '@/lib/catalog/types';

const NOW = new Date('2026-11-15T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const work = (title: string, kind: WorkKind = 'movie', externalId = '603'): NormalizedWork => ({
  kind, externalId, title, originalTitle: null, overview: null, overviewLang: null, posterUrl: null,
  releaseDateBR: null, theatricalDateBR: null, digitalDateBR: null, trailerYoutubeKey: null,
  people: [], availability: [], seasons: [], isbns: [],
});

function memoryRepo(seed?: { work: NormalizedWork; syncedAt: string }): WorkRepository & { saved: NormalizedWork[] } {
  const rows = new Map<string, { work: NormalizedWork; id: string; syncedAt: string }>();
  if (seed) rows.set(`${seed.work.kind}:${seed.work.externalId}`, { ...seed, id: 'id-1' });
  const saved: NormalizedWork[] = [];
  return {
    saved,
    async find(kind, externalId) { return rows.get(`${kind}:${externalId}`) ?? null; },
    async save(w) {
      saved.push(w);
      const id = rows.get(`${w.kind}:${w.externalId}`)?.id ?? 'id-new';
      rows.set(`${w.kind}:${w.externalId}`, { work: w, id, syncedAt: NOW.toISOString() });
      return id;
    },
  };
}

const fetchers = (impl: () => Promise<NormalizedWork>) => ({ tmdb: vi.fn(impl), book: vi.fn(impl) });

describe('needsRefresh', () => {
  it('is false at 6 days and true at 8 days', () => {
    expect(needsRefresh(daysAgo(6), NOW)).toBe(false);
    expect(needsRefresh(daysAgo(8), NOW)).toBe(true);
  });
});

describe('getOrFetchWork', () => {
  it('cache miss fetches and saves', async () => {
    const repo = memoryRepo();
    const f = fetchers(async () => work('Matrix'));
    const r = await getOrFetchWork('movie', '603', { repo, fetchers: f, now: NOW });
    expect(f.tmdb).toHaveBeenCalledWith('movie', '603');
    expect(repo.saved).toHaveLength(1);
    expect(r).toEqual({ id: 'id-new', work: work('Matrix'), stale: false });
  });

  it('routes books to the book fetcher', async () => {
    const repo = memoryRepo();
    const f = fetchers(async () => work('Dom Casmurro', 'book', 'OL1W'));
    await getOrFetchWork('book', 'OL1W', { repo, fetchers: f, now: NOW });
    expect(f.book).toHaveBeenCalledWith('OL1W');
    expect(f.tmdb).not.toHaveBeenCalled();
  });

  it('fresh hit does not fetch', async () => {
    const repo = memoryRepo({ work: work('Cached'), syncedAt: daysAgo(1) });
    const f = fetchers(async () => work('New'));
    const r = await getOrFetchWork('movie', '603', { repo, fetchers: f, now: NOW });
    expect(f.tmdb).not.toHaveBeenCalled();
    expect(r).toMatchObject({ id: 'id-1', stale: false, work: { title: 'Cached' } });
  });

  it('stale hit refreshes', async () => {
    const repo = memoryRepo({ work: work('Old'), syncedAt: daysAgo(10) });
    const f = fetchers(async () => work('Fresh'));
    const r = await getOrFetchWork('movie', '603', { repo, fetchers: f, now: NOW });
    expect(r).toMatchObject({ id: 'id-1', stale: false, work: { title: 'Fresh' } });
  });

  it('stale hit with source down returns cached copy', async () => {
    const repo = memoryRepo({ work: work('Old'), syncedAt: daysAgo(10) });
    const f = fetchers(async () => { throw new CatalogUnavailableError('tmdb'); });
    const r = await getOrFetchWork('movie', '603', { repo, fetchers: f, now: NOW });
    expect(r).toMatchObject({ stale: true, work: { title: 'Old' } });
  });

  it('miss with source down throws CatalogUnavailableError', async () => {
    const f = fetchers(async () => { throw new CatalogUnavailableError('tmdb'); });
    await expect(getOrFetchWork('movie', '603', { repo: memoryRepo(), fetchers: f, now: NOW })).rejects.toBeInstanceOf(CatalogUnavailableError);
  });

  it('not found propagates', async () => {
    const f = fetchers(async () => { throw new WorkNotFoundError('x'); });
    await expect(getOrFetchWork('movie', '1', { repo: memoryRepo(), fetchers: f, now: NOW })).rejects.toBeInstanceOf(WorkNotFoundError);
  });
});

describe('getOrFetchWork with database failures', () => {
  const broken = (part: 'find' | 'save'): WorkRepository => ({
    find: part === 'find' ? async () => { throw new Error('Supabase: paused'); } : async () => null,
    save: async () => { throw new Error('Supabase: paused'); },
  });

  it('database read failure still serves the fetched work', async () => {
    const f = fetchers(async () => work('Matrix'));
    const r = await getOrFetchWork('movie', '603', { repo: broken('find'), fetchers: f, now: NOW });
    expect(r).toEqual({ id: null, work: work('Matrix'), stale: false });
  });

  it('database write failure still serves the fetched work', async () => {
    const f = fetchers(async () => work('Matrix'));
    const r = await getOrFetchWork('movie', '603', { repo: broken('save'), fetchers: f, now: NOW });
    expect(r).toEqual({ id: null, work: work('Matrix'), stale: false });
  });

  it('stale hit whose refresh cannot be saved keeps the cached id', async () => {
    const repo = memoryRepo({ work: work('Old'), syncedAt: daysAgo(10) });
    repo.save = async () => { throw new Error('Supabase: paused'); };
    const r = await getOrFetchWork('movie', '603', { repo, fetchers: fetchers(async () => work('Fresh')), now: NOW });
    expect(r).toMatchObject({ id: 'id-1', stale: false, work: { title: 'Fresh' } });
  });
});

describe('getOrFetchWork without Supabase configured', () => {
  it('serves the fetched work when Supabase env vars are missing', async () => {
    const saved = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const r = await getOrFetchWork('movie', '603', { fetchers: fetchers(async () => work('Matrix')), now: NOW });
      expect(r).toEqual({ id: null, work: work('Matrix'), stale: false });
    } finally {
      if (saved.url) process.env.NEXT_PUBLIC_SUPABASE_URL = saved.url;
      if (saved.key) process.env.SUPABASE_SERVICE_ROLE_KEY = saved.key;
    }
  });
});
