import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, asServiceRole, createUser, expectDbError } from './harness';

type Id = { id: string };
type Lobby = { average: string | null; ratings: number };

describe.skipIf(!hasDb)('ratings', () => {
  let work: string;
  let other: string;
  let people: string[];

  const rate = (who: string, w: string, rating: number | null, status = 'concluido') =>
    asUser(who, 'insert into list_items(work_id, status, rating) values ($1, $2, $3)', [w, status, rating]);
  const lobby = (w: string, as: 'anon' | string = 'anon') =>
    as === 'anon'
      ? asAnon<Lobby>('select * from lobby_rating($1)', [w])
      : asUser<Lobby>(as, 'select * from lobby_rating($1)', [w]);

  beforeEach(async () => {
    await resetDatabase();
    [{ id: work }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
    [{ id: other }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '604', 'Reloaded') returning id");
    people = [];
    for (const n of ['ana', 'bia', 'cris', 'duda']) people.push(await createUser(`${n}@example.com`));
  });

  it('no ratings: no average and zero count', async () => {
    expect(await lobby(work)).toEqual([{ average: null, ratings: 0 }]);
  });

  it('below 3 ratings the average stays hidden, for visitors and members alike', async () => {
    await rate(people[0], work, 5);
    expect(await lobby(work)).toEqual([{ average: null, ratings: 1 }]);
    await rate(people[1], work, 2);
    expect(await lobby(work)).toEqual([{ average: null, ratings: 2 }]);
    // Even the person who rated can't use it to learn the other rating.
    expect(await lobby(work, people[0])).toEqual([{ average: null, ratings: 2 }]);
  });

  it('from 3 ratings shows the average rounded to one decimal, ignoring items without a rating', async () => {
    await rate(people[0], work, 5);
    await rate(people[1], work, 4);
    await rate(people[2], work, 4);
    await rate(people[3], work, null, 'quero');
    await rate(people[3], other, 1);
    expect(await lobby(work)).toEqual([{ average: '4.3', ratings: 3 }]);
    expect(await lobby(work, people[3])).toEqual([{ average: '4.3', ratings: 3 }]);
  });

  it('counts ratings from private lists without exposing who rated', async () => {
    for (const p of people.slice(0, 3)) await rate(p, work, 3);
    // Lists are private: visitors and other members can't read the items, only the aggregate.
    await expectDbError(asAnon('select * from list_items'), /permission denied/);
    expect(await asUser(people[3], 'select * from list_items')).toEqual([]);
    expect(await lobby(work)).toEqual([{ average: '3.0', ratings: 3 }]);
  });

  it('unknown work: zero ratings', async () => {
    expect(await lobby('00000000-0000-0000-0000-000000000000')).toEqual([{ average: null, ratings: 0 }]);
  });

  it('works have public external score columns that only the server writes', async () => {
    await asServiceRole(
      "update works set imdb_id = 'tt0133093', imdb_rating = 8.7, imdb_votes = 2100000, rt_score = 83, ratings_checked_on = '2026-11-16' where id = $1",
      [work],
    );
    expect(await asAnon('select imdb_id, imdb_rating, imdb_votes, rt_score, ratings_checked_on::text from works where id = $1', [work])).toEqual([
      { imdb_id: 'tt0133093', imdb_rating: '8.7', imdb_votes: 2100000, rt_score: 83, ratings_checked_on: '2026-11-16' },
    ]);
    await asUser(people[0], 'update works set imdb_rating = 1 where id = $1', [work]).catch(() => {});
    expect(await asAnon<{ imdb_rating: string }>('select imdb_rating from works where id = $1', [work])).toEqual([{ imdb_rating: '8.7' }]);
  });

  it('rejects impossible scores', async () => {
    await expectDbError(asSuperuser('update works set rt_score = 101 where id = $1', [work]), /check/);
    await expectDbError(asSuperuser('update works set rt_score = -1 where id = $1', [work]), /check/);
    await expectDbError(asSuperuser('update works set imdb_rating = 10.5 where id = $1', [work]), /check/);
  });
});
