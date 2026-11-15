import { CatalogUnavailableError } from './errors';
import type { WorkRepository } from './repository';
import type { fetchTmdbWork } from './tmdb-client';
import type { fetchBook } from './books-client';
import type { NormalizedWork, WorkKind } from './types';

const MAX_AGE_MS = 7 * 86_400_000;

export function needsRefresh(syncedAt: string, now: Date): boolean {
  return now.getTime() - new Date(syncedAt).getTime() > MAX_AGE_MS;
}

type Fetchers = { tmdb: typeof fetchTmdbWork; book: typeof fetchBook };

/** Used when Supabase isn't configured: no cache, every visit fetches from the source. */
const noCache: WorkRepository = {
  async find() { return null; },
  async save() { throw new Error('Supabase não configurado'); },
};

async function defaultRepo(): Promise<WorkRepository> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[catalog] Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    return noCache;
  }
  const [{ createServiceClient }, { supabaseWorkRepository }] = await Promise.all([import('@/lib/supabase/server'), import('./repository')]);
  return supabaseWorkRepository(createServiceClient());
}

async function defaultFetchers(): Promise<Fetchers> {
  const [tmdb, books] = await Promise.all([import('./tmdb-client'), import('./books-client')]);
  return { tmdb: tmdb.fetchTmdbWork, book: books.fetchBook };
}

export async function getOrFetchWork(
  kind: WorkKind,
  externalId: string,
  deps: { repo?: WorkRepository; fetchers?: Fetchers; now?: Date } = {},
): Promise<{ id: string | null; work: NormalizedWork; stale: boolean }> {
  const repo = deps.repo ?? (await defaultRepo());
  const fetchers = deps.fetchers ?? (await defaultFetchers());
  const now = deps.now ?? new Date();

  // The database is a cache: if it is down (e.g. paused free project), serve straight from the source.
  const cached = await repo.find(kind, externalId).catch((e) => {
    console.error('[catalog] cache read failed', e);
    return null;
  });
  if (cached && !needsRefresh(cached.syncedAt, now)) return { id: cached.id, work: cached.work, stale: false };

  let work: NormalizedWork;
  try {
    work = kind === 'book' ? await fetchers.book(externalId) : await fetchers.tmdb(kind, externalId);
  } catch (e) {
    if (cached && e instanceof CatalogUnavailableError) return { id: cached.id, work: cached.work, stale: true };
    throw e;
  }

  const id = await repo.save(work).catch((e) => {
    console.error('[catalog] cache write failed', e);
    return cached?.id ?? null;
  });
  return { id, work, stale: false };
}
