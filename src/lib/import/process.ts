import { CatalogUnavailableError } from '@/lib/catalog/errors';
import type { WorkKind } from '@/lib/catalog/types';
import type { ListStatus } from '@/lib/list/types';
import { moreAdvanced, type ImportRow } from './types';

export const BATCH_SIZE = 10;

type Deps = {
  match: (row: ImportRow) => Promise<{ kind: WorkKind; externalId: string } | null>;
  getWork: (kind: WorkKind, externalId: string) => Promise<{ id: string | null }>;
  saveListItem: (workId: string, row: ImportRow) => Promise<void>;
  markItem: (id: string, state: 'importado' | 'nao_encontrado', workId: string | null) => Promise<void>;
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
  for (const { id, row } of items) {
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
