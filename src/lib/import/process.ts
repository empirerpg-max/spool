import { CatalogUnavailableError } from '@/lib/catalog/errors';
import type { WorkKind } from '@/lib/catalog/types';
import type { ListStatus } from '@/lib/list/types';
import { moreAdvanced, type ImportRow } from './types';

export const BATCH_SIZE = 10;
/** Stop taking new rows after this long, so a batch stays well under Vercel's 60s limit. */
export const BATCH_BUDGET_MS = 40_000;
/** A row whose source keeps failing is given up after this many tries, so it can't stall the import. */
export const MAX_ATTEMPTS = 3;

type Deps = {
  match: (row: ImportRow) => Promise<{ kind: WorkKind; externalId: string } | null>;
  getWork: (kind: WorkKind, externalId: string) => Promise<{ id: string | null }>;
  saveListItem: (workId: string, row: ImportRow) => Promise<void>;
  markItem: (id: string, state: 'importado' | 'nao_encontrado', workId: string | null) => Promise<void>;
  /** Increments and returns the row's failed-attempt count. */
  bumpAttempts: (id: string) => Promise<number>;
  now?: () => number;
};

/**
 * Imports one batch. A source outage stops the batch and leaves the row pending (retried on the next call);
 * any other failure only marks that row as not found, so one bad row never blocks the rest.
 */
export async function processBatch(
  items: Array<{ id: string; row: ImportRow }>,
  deps: Deps,
): Promise<{ imported: number; notFound: number; retryLater: number }> {
  const result = { imported: 0, notFound: 0, retryLater: 0 };
  const now = deps.now ?? Date.now;
  const start = now();
  for (const { id, row } of items) {
    if (now() - start >= BATCH_BUDGET_MS) break;
    try {
      const match = await deps.match(row);
      const work = match ? await deps.getWork(match.kind, match.externalId) : null;
      if (!work?.id) {
        await deps.markItem(id, 'nao_encontrado', null);
        result.notFound++;
        continue;
      }
      await deps.saveListItem(work.id, row);
      await deps.markItem(id, 'importado', work.id);
      result.imported++;
    } catch (e) {
      if (e instanceof CatalogUnavailableError) {
        if ((await deps.bumpAttempts(id).catch(() => MAX_ATTEMPTS)) >= MAX_ATTEMPTS) {
          await deps.markItem(id, 'nao_encontrado', null).catch(() => {});
          result.notFound++;
          continue;
        }
        result.retryLater++;
        break;
      }
      console.error('[import] row failed', e);
      await deps.markItem(id, 'nao_encontrado', null).catch(() => {});
      result.notFound++;
    }
  }
  return result;
}

type Existing = { status: ListStatus; rating: number | null; review: string | null; finished_on: string | null };

/** Combines an imported row with what the person already has: never downgrades, never overwrites their own words. */
export function mergeImported(existing: Existing | null, row: ImportRow): Existing {
  const status = existing ? moreAdvanced(existing.status, row.status) : row.status;
  if (status !== 'concluido') return { status, rating: null, review: null, finished_on: null };
  const fromRow = row.status === 'concluido';
  return {
    status,
    rating: existing?.rating ?? (fromRow ? row.rating : null),
    review: existing?.review ?? (fromRow ? row.review : null),
    finished_on: existing?.finished_on ?? (fromRow ? row.finishedOn : null),
  };
}
