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
): Promise<{ id: string; work: NormalizedWork; stale: boolean }> {
  const base = deps.repo && deps.fetchers ? null : await defaults();
  const repo = deps.repo ?? base!.repo;
  const fetchers = deps.fetchers ?? base!.fetchers;
  const now = deps.now ?? new Date();

  const cached = await repo.find(kind, externalId);
  if (cached && !needsRefresh(cached.syncedAt, now)) return { id: cached.id, work: cached.work, stale: false };

  try {
    const work = kind === 'book' ? await fetchers.book(externalId) : await fetchers.tmdb(kind, externalId);
    const id = await repo.save(work);
    return { id, work, stale: false };
  } catch (e) {
    if (cached && e instanceof CatalogUnavailableError) return { id: cached.id, work: cached.work, stale: true };
    throw e;
  }
}
