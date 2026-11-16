import { describe, it, expect, vi } from 'vitest';
import { runDailyBatch, type JobDeps } from '@/lib/alerts/job';
import { CatalogUnavailableError, WorkNotFoundError } from '@/lib/catalog/errors';
import type { NormalizedWork } from '@/lib/catalog/types';

const TODAY = '2026-11-16';
const work = (over: Partial<NormalizedWork> = {}): NormalizedWork => ({
  kind: 'movie', externalId: '603', title: 'Matrix', originalTitle: null, overview: null, overviewLang: null,
  posterUrl: null, backdropUrl: null, releaseDateBR: null, theatricalDateBR: null, digitalDateBR: null,
  trailerYoutubeKey: null, people: [], availability: [], seasons: [], isbns: [], imdbId: null, ...over,
});

function deps(over: Partial<JobDeps> = {}): JobDeps & { checked: string[]; recorded: string[] } {
  const checked: string[] = [];
  const recorded: string[] = [];
  return {
    checked, recorded,
    today: TODAY,
    dueWorks: vi.fn(async () => [{ id: 'w1', kind: 'movie' as const, externalId: '603' }]),
    remainingCount: vi.fn(async () => 0),
    findCached: vi.fn(async () => work()),
    fetchFresh: vi.fn(async () => work({ theatricalDateBR: TODAY })),
    save: vi.fn(async () => {}),
    recordEvent: vi.fn(async (_id: string, e: { key: string }) => { recorded.push(e.key); return 1; }),
    markChecked: vi.fn(async (id: string) => { checked.push(id); }),
    noteFailure: vi.fn(async () => {}),
    sendPushes: vi.fn(async () => {}),
    prune: vi.fn(async () => {}),
    ...over,
  };
}

describe('runDailyBatch', () => {
  it('refreshes due works, records their events and marks them checked', async () => {
    const d = deps();
    expect(await runDailyBatch(d)).toEqual({ processed: 1, events: 1, remaining: 0 });
    expect(d.recorded).toEqual(['cinema:w1']);
    expect(d.checked).toEqual(['w1']);
    expect(d.save).toHaveBeenCalled();
    expect(d.sendPushes).toHaveBeenCalled();
    expect(d.prune).toHaveBeenCalled();
  });

  it('leaves a work due when its source is down, counting the failure', async () => {
    const d = deps({ fetchFresh: vi.fn(async () => { throw new CatalogUnavailableError('tmdb'); }), remainingCount: vi.fn(async () => 1) });
    expect(await runDailyBatch(d)).toEqual({ processed: 0, events: 0, remaining: 1 });
    expect(d.checked).toEqual([]);
    expect(d.noteFailure).toHaveBeenCalledWith('w1');
  });

  it('records events before saving the new copy, so a failure never loses them', async () => {
    const order: string[] = [];
    const d = deps({
      recordEvent: vi.fn(async () => { order.push('record'); return 1; }),
      save: vi.fn(async () => { order.push('save'); }),
    });
    await runDailyBatch(d);
    expect(order).toEqual(['record', 'save']);
  });

  it('a database error while recording keeps the old copy and the work due', async () => {
    const d = deps({ recordEvent: vi.fn(async () => { throw new Error('Supabase: down'); }) });
    expect(await runDailyBatch(d)).toMatchObject({ processed: 0 });
    expect(d.save).not.toHaveBeenCalled();
    expect(d.checked).toEqual([]);
    expect(d.noteFailure).toHaveBeenCalledWith('w1');
  });

  it('marks works that no longer exist upstream as checked, without events', async () => {
    const d = deps({ fetchFresh: vi.fn(async () => { throw new WorkNotFoundError('x'); }) });
    expect(await runDailyBatch(d)).toMatchObject({ processed: 1, events: 0 });
    expect(d.checked).toEqual(['w1']);
  });

  it('uses no previous copy when the work was never cached', async () => {
    const d = deps({ findCached: vi.fn(async () => null), fetchFresh: vi.fn(async () => work({ availability: [{ provider: 'Max', type: 'subscription', logoUrl: null, link: null }] })) });
    expect(await runDailyBatch(d)).toMatchObject({ events: 0 });
  });

  it('nothing due means nothing fetched', async () => {
    const d = deps({ dueWorks: vi.fn(async () => []) });
    expect(await runDailyBatch(d)).toEqual({ processed: 0, events: 0, remaining: 0 });
    expect(d.fetchFresh).not.toHaveBeenCalled();
  });

  it('stops taking works when the time budget is spent', async () => {
    let t = 0;
    const d = deps({
      now: () => t,
      dueWorks: vi.fn(async () => [1, 2, 3].map((i) => ({ id: `w${i}`, kind: 'movie' as const, externalId: String(i) }))),
      fetchFresh: vi.fn(async () => { t += 25_000; return work(); }),
    });
    expect((await runDailyBatch(d)).processed).toBe(2);
  });

  it('refreshes external scores of films and series after saving, not of books', async () => {
    const order: string[] = [];
    const refreshRatings = vi.fn(async () => { order.push('ratings'); });
    const d = deps({
      save: vi.fn(async () => { order.push('save'); }),
      refreshRatings,
      dueWorks: vi.fn(async () => [
        { id: 'w1', kind: 'movie' as const, externalId: '603' },
        { id: 'w2', kind: 'book' as const, externalId: 'OL1W' },
        { id: 'w3', kind: 'series' as const, externalId: '1399' },
      ]),
    });
    await runDailyBatch(d);
    expect(refreshRatings.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['w1', 'w3']);
    expect(order.slice(0, 2)).toEqual(['save', 'ratings']);
  });

  it('a failure of the external scores never fails the check', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const d = deps({ refreshRatings: vi.fn(async () => { throw new Error('omdb down'); }) });
    expect(await runDailyBatch(d)).toMatchObject({ processed: 1 });
    expect(d.checked).toEqual(['w1']);
    expect(d.noteFailure).not.toHaveBeenCalled();
  });

  it('skips external scores once the time budget is spent', async () => {
    let t = 0;
    const refreshRatings = vi.fn(async () => {});
    const d = deps({ now: () => t, refreshRatings, fetchFresh: vi.fn(async () => { t += 45_000; return work(); }) });
    expect(await runDailyBatch(d)).toMatchObject({ processed: 1 });
    expect(refreshRatings).not.toHaveBeenCalled();
  });
});
