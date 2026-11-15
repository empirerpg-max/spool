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

async function defaults(): Promise<{ repo: WorkRepository; fetchers: Fetchers }> {
  const [{ createServiceClient }, { supabaseWorkRepository }, tmdb, books] = await Promise.all([
    import('@/lib/supabase/server'),
    import('./repository'),
    import('./tmdb-client'),
    import('./books-client'),
  ]);
  return { repo: supabaseWorkRepository(createServiceClient()), fetchers: { tmdb: tmdb.fetchTmdbWork, book: books.fetchBook } };
}

export async function getOrFetchWork(
  kind: WorkKind,
  externalId: string,
  deps: { repo?: WorkRepository; fetchers?: Fetchers; now?: Date } = {},
): Promise<{ id: string | null; work: NormalizedWork; stale: boolean }> {
  const base = deps.repo && deps.fetchers ? null : await defaults();
  const repo = deps.repo ?? base!.repo;
  const fetchers = deps.fetchers ?? base!.fetchers;
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
