import { describe, it, expect } from 'vitest';
import { detectEvents } from '@/lib/alerts/detect';
import type { NormalizedWork } from '@/lib/catalog/types';

const TODAY = '2026-11-16';
const work = (over: Partial<NormalizedWork> = {}): NormalizedWork => ({
  kind: 'movie', externalId: '603', title: 'Matrix', originalTitle: null, overview: null, overviewLang: null,
  posterUrl: null, backdropUrl: null, releaseDateBR: null, theatricalDateBR: null, digitalDateBR: null,
  trailerYoutubeKey: null, people: [], availability: [], seasons: [], isbns: [], ...over,
});
const run = (before: NormalizedWork | null, after: NormalizedWork) =>
  detectEvents({ workId: 'w1', path: '/obra/filme/603', before, after, today: TODAY });

describe('detectEvents', () => {
  it('announces the cinema premiere on the day', () => {
    expect(run(null, work({ theatricalDateBR: TODAY }))).toEqual([
      { kind: 'cinema', key: 'cinema:w1', title: 'Matrix estreou nos cinemas', body: null, url: '/obra/filme/603' },
    ]);
    expect(run(null, work({ theatricalDateBR: '2026-11-15' }))).toEqual([]);
  });

  it('announces each new streaming service, but not on the first check', () => {
    const before = work({ availability: [{ provider: 'Max', type: 'subscription', logoUrl: null, link: null }] });
    const after = work({ availability: [
      { provider: 'Max', type: 'subscription', logoUrl: null, link: null },
      { provider: 'Netflix', type: 'subscription', logoUrl: null, link: null },
      { provider: 'Pluto TV', type: 'ads', logoUrl: null, link: null },
      { provider: 'Apple TV', type: 'rent', logoUrl: null, link: null },
    ] });
    expect(run(before, after).map((e) => e.title)).toEqual(['Matrix chegou na Netflix', 'Matrix chegou na Pluto TV']);
    expect(run(before, after)[0].key).toBe('streaming:w1:Netflix:2026-11-16');
    expect(run(null, after)).toEqual([]);
  });

  it('a service that moves from rent to subscription counts as arriving', () => {
    const before = work({ availability: [{ provider: 'Prime Video', type: 'rent', logoUrl: null, link: null }] });
    const after = work({ availability: [{ provider: 'Prime Video', type: 'subscription', logoUrl: null, link: null }] });
    expect(run(before, after).map((e) => e.title)).toEqual(['Matrix chegou na Prime Video']);
  });

  it('announces a new season date and its premiere', () => {
    const s = (number: number, airDate: string | null) => ({ number, airDate, episodeCount: 8 });
    const before = work({ kind: 'series', title: 'The Bear', seasons: [s(1, '2022-06-23'), s(2, '2023-06-22')] });
    const announced = work({ kind: 'series', title: 'The Bear', seasons: [s(1, '2022-06-23'), s(2, '2023-06-22'), s(3, '2027-06-25')] });
    expect(run(before, announced)).toEqual([{
      kind: 'temporada_anunciada', key: 'temporada_anunciada:w1:3:2027-06-25',
      title: 'The Bear: temporada 3 estreia em 25/06', body: null, url: '/obra/filme/603',
    }]);
    expect(run(before, work({ kind: 'series', title: 'The Bear', seasons: [s(3, null)] }))).toEqual([]);
    expect(run(null, announced)).toEqual([]);
    const premiere = work({ kind: 'series', title: 'The Bear', seasons: [s(3, TODAY)] });
    expect(run(announced, premiere).map((e) => [e.kind, e.title])).toEqual([['temporada_estreia', 'The Bear: temporada 3 estreou']]);
    expect(run(null, premiere).map((e) => e.key)).toEqual(['temporada_estreia:w1:3']);
  });

  it('a season whose date moves is announced again with the new date', () => {
    const s = (airDate: string) => ({ number: 2, airDate, episodeCount: 8 });
    const e = run(work({ kind: 'series', seasons: [s('2027-01-10')] }), work({ kind: 'series', seasons: [s('2027-02-20')] }));
    expect(e.map((x) => x.key)).toEqual(['temporada_anunciada:w1:2:2027-02-20']);
  });

  it('announces a book release on the day', () => {
    expect(run(null, work({ kind: 'book', title: 'Torto Arado', releaseDateBR: TODAY })).map((e) => e.title)).toEqual(['Torto Arado foi lançado']);
    expect(run(null, work({ kind: 'movie', releaseDateBR: TODAY }))).toEqual([]);
  });
});
