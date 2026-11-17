import { describe, it, expect, vi } from 'vitest';
import { dailyBudget, ratingsDue, refreshRatingsIfDue, type ExternalRatings } from '@/lib/catalog/ratings';

const TODAY = '2026-11-16';
const current = (over: Partial<ExternalRatings> = {}): ExternalRatings => ({
  imdbId: 'tt0133093', imdbRating: 8.5, imdbVotes: 100, rtScore: 80, checkedOn: null, ...over,
});
const fresh = { imdbRating: 8.7, imdbVotes: 2123456, rtScore: 83 };

function deps(over: Partial<Parameters<typeof refreshRatingsIfDue>[1]> = {}) {
  return {
    today: TODAY,
    read: vi.fn(async () => current()),
    fetchRatings: vi.fn(async () => fresh),
    write: vi.fn(async () => {}),
    ...over,
  };
}

describe('ratingsDue', () => {
  it('needs an IMDb id', () => {
    expect(ratingsDue(null, null, TODAY)).toBe(false);
  });

  it('is due when never checked or checked more than 7 days ago', () => {
    expect(ratingsDue('tt1', null, TODAY)).toBe(true);
    expect(ratingsDue('tt1', '2026-11-08', TODAY)).toBe(true);
    expect(ratingsDue('tt1', '2026-11-09', TODAY)).toBe(false);
    expect(ratingsDue('tt1', '2026-11-16', TODAY)).toBe(false);
  });

  it('works across months and years', () => {
    expect(ratingsDue('tt1', '2026-12-25', '2027-01-02')).toBe(true);
    expect(ratingsDue('tt1', '2026-12-27', '2027-01-02')).toBe(false);
  });
});

describe('refreshRatingsIfDue', () => {
  it('fetches, stores with today\'s date and returns the new scores', async () => {
    const d = deps();
    expect(await refreshRatingsIfDue('w1', d)).toEqual({ imdbId: 'tt0133093', ...fresh, checkedOn: TODAY });
    expect(d.fetchRatings).toHaveBeenCalledWith('tt0133093');
    expect(d.write).toHaveBeenCalledWith('w1', fresh, TODAY);
  });

  it('does not call OMDb when checked recently', async () => {
    const d = deps({ read: vi.fn(async () => current({ checkedOn: '2026-11-12' })) });
    expect(await refreshRatingsIfDue('w1', d)).toEqual(current({ checkedOn: '2026-11-12' }));
    expect(d.fetchRatings).not.toHaveBeenCalled();
    expect(d.write).not.toHaveBeenCalled();
  });

  it('does not call OMDb without an IMDb id', async () => {
    const d = deps({ read: vi.fn(async () => current({ imdbId: null })) });
    await refreshRatingsIfDue('w1', d);
    expect(d.fetchRatings).not.toHaveBeenCalled();
  });

  it('records the check even when OMDb has no scores, so it is not retried every day', async () => {
    const none = { imdbRating: null, imdbVotes: null, rtScore: null };
    const d = deps({ fetchRatings: vi.fn(async () => none) });
    expect(await refreshRatingsIfDue('w1', d)).toEqual({ imdbId: 'tt0133093', ...none, checkedOn: TODAY });
    expect(d.write).toHaveBeenCalledWith('w1', none, TODAY);
  });

  it('when OMDb fails (or has no key) keeps the old scores and leaves it due', async () => {
    const d = deps({ fetchRatings: vi.fn(async () => null) });
    expect(await refreshRatingsIfDue('w1', d)).toEqual(current());
    expect(d.write).not.toHaveBeenCalled();
  });

  it('respects the call budget', async () => {
    const d = deps({ budget: () => false });
    expect(await refreshRatingsIfDue('w1', d)).toEqual(current());
    expect(d.fetchRatings).not.toHaveBeenCalled();
  });

  it('a database error while saving still shows the new scores', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const d = deps({ write: vi.fn(async () => { throw new Error('Supabase: down'); }) });
    expect(await refreshRatingsIfDue('w1', d)).toMatchObject(fresh);
  });

  it('unknown work: null', async () => {
    const d = deps({ read: vi.fn(async () => null) });
    expect(await refreshRatingsIfDue('w1', d)).toBeNull();
    expect(d.fetchRatings).not.toHaveBeenCalled();
  });
});

describe('dailyBudget', () => {
  it('allows up to the limit per day and starts over the next day', () => {
    const take = dailyBudget(2);
    expect([take(TODAY), take(TODAY), take(TODAY)]).toEqual([true, true, false]);
    expect(take('2026-11-17')).toBe(true);
  });
});

describe('refreshRatingsIfDue without a stored IMDb id', () => {
  it('looks the id up, saves it, then asks OMDb', async () => {
    const d = deps({
      read: vi.fn(async () => current({ imdbId: null, checkedOn: null })),
      lookupImdbId: vi.fn(async () => 'tt0133093'),
      saveImdbId: vi.fn(async () => {}),
    });
    const r = await refreshRatingsIfDue('w1', d);
    expect(d.lookupImdbId).toHaveBeenCalled();
    expect(d.saveImdbId).toHaveBeenCalledWith('w1', 'tt0133093');
    expect(d.fetchRatings).toHaveBeenCalledWith('tt0133093');
    expect(r?.imdbId).toBe('tt0133093');
  });

  it('stays quiet when the lookup finds nothing', async () => {
    const d = deps({
      read: vi.fn(async () => current({ imdbId: null, checkedOn: null })),
      lookupImdbId: vi.fn(async () => null),
      saveImdbId: vi.fn(async () => {}),
    });
    await refreshRatingsIfDue('w1', d);
    expect(d.saveImdbId).not.toHaveBeenCalled();
    expect(d.fetchRatings).not.toHaveBeenCalled();
  });
});

