import { describe, it, expect, vi } from 'vitest';
import { processBatch } from '@/lib/import/process';
import { CatalogUnavailableError } from '@/lib/catalog/errors';
import type { ImportRow } from '@/lib/import/types';

const row = (title: string): ImportRow => ({
  kind: 'movie', title, year: 2020, author: null, isbn: null, status: 'concluido', rating: 4, review: 'Bom', finishedOn: null,
});
const items = (...titles: string[]) => titles.map((t, i) => ({ id: `i${i}`, row: row(t) }));

function deps(over: Partial<Parameters<typeof processBatch>[1]> = {}) {
  return {
    match: vi.fn(async (r: ImportRow) => ({ kind: 'movie' as const, externalId: r.title })),
    getWork: vi.fn(async (_k: string, id: string) => ({ id: `w-${id}` })),
    saveListItem: vi.fn(async () => {}),
    markItem: vi.fn(async () => {}),
    bumpAttempts: vi.fn(async () => 1),
    now: () => 0,
    ...over,
  };
}

describe('processBatch', () => {
  it('imports matched rows', async () => {
    const d = deps();
    expect(await processBatch(items('A'), d)).toEqual({ imported: 1, notFound: 0, retryLater: 0 });
    expect(d.saveListItem).toHaveBeenCalledWith('w-A', row('A'));
    expect(d.markItem).toHaveBeenCalledWith('i0', 'importado', 'w-A');
  });

  it('marks unmatched rows as not found without saving', async () => {
    const d = deps({ match: vi.fn(async () => null) });
    expect(await processBatch(items('A'), d)).toEqual({ imported: 0, notFound: 1, retryLater: 0 });
    expect(d.saveListItem).not.toHaveBeenCalled();
    expect(d.markItem).toHaveBeenCalledWith('i0', 'nao_encontrado', null);
  });

  it('treats a work that could not be cached as not found', async () => {
    const d = deps({ getWork: vi.fn(async () => ({ id: null })) });
    expect(await processBatch(items('A'), d)).toMatchObject({ notFound: 1 });
    expect(d.saveListItem).not.toHaveBeenCalled();
  });

  it('stops the batch and leaves the row pending when a source is down', async () => {
    const match = vi.fn()
      .mockResolvedValueOnce({ kind: 'movie', externalId: 'A' })
      .mockRejectedValueOnce(new CatalogUnavailableError('tmdb'));
    const d = deps({ match });
    expect(await processBatch(items('A', 'B', 'C'), d)).toEqual({ imported: 1, notFound: 0, retryLater: 1 });
    expect(d.markItem).toHaveBeenCalledTimes(1);
    expect(match).toHaveBeenCalledTimes(2);
  });

  it('an unexpected error on one row does not block the rest', async () => {
    const d = deps({ saveListItem: vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined) });
    expect(await processBatch(items('A', 'B'), d)).toEqual({ imported: 1, notFound: 1, retryLater: 0 });
    expect(d.markItem).toHaveBeenCalledWith('i0', 'nao_encontrado', null);
    expect(d.markItem).toHaveBeenCalledWith('i1', 'importado', 'w-B');
  });

  it('gives up on a row that keeps failing and moves on', async () => {
    const match = vi.fn()
      .mockRejectedValueOnce(new CatalogUnavailableError('books'))
      .mockResolvedValue({ kind: 'movie', externalId: 'B' });
    const d = deps({ match, bumpAttempts: vi.fn(async () => 3) });
    expect(await processBatch(items('A', 'B'), d)).toEqual({ imported: 1, notFound: 1, retryLater: 0 });
    expect(d.markItem).toHaveBeenCalledWith('i0', 'nao_encontrado', null);
  });

  it('stops when the time budget is spent', async () => {
    let t = 0;
    const d = deps({ now: () => t, match: vi.fn(async (r: ImportRow) => { t += 25_000; return { kind: 'movie' as const, externalId: r.title }; }) });
    expect(await processBatch(items('A', 'B', 'C'), d)).toEqual({ imported: 2, notFound: 0, retryLater: 0 });
  });
});
