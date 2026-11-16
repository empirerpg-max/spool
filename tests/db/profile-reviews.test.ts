import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, createUser, expectDbError } from './harness';

type Id = { id: string };
type Row = { topic_id: string; work_id: string };

describe.skipIf(!hasDb)('profile_reviews', () => {
  let work: string;
  let work2: string;
  let ana: string;
  let bia: string;

  const named = async (email: string, username: string) => {
    const id = await createUser(email);
    await asSuperuser('update profiles set username = $2 where id = $1', [id, username]);
    return id;
  };
  const publish = async (who: string, workId: string) => {
    await asUser(who, "insert into list_items(work_id, status, review, rating) values ($1, 'concluido', 'Ótimo', 4)", [workId]);
    return (await asUser<Id>(who, 'select publish_review($1) as id', [workId]))[0].id;
  };
  const reviews = (viewer: string, profile: string) =>
    asUser<Row>(viewer, 'select topic_id, work_id from profile_reviews($1)', [profile]);

  beforeEach(async () => {
    await resetDatabase();
    [{ id: work }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
    [{ id: work2 }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '604', 'Matrix 2') returning id");
    ana = await named('ana@example.com', 'ana');
    bia = await named('bia@example.com', 'bia');
  });

  it('lists the published reviews of a person, newest first, to other members', async () => {
    const r1 = await publish(ana, work);
    const r2 = await publish(ana, work2);
    expect(await reviews(bia, ana)).toEqual([{ topic_id: r2, work_id: work2 }, { topic_id: r1, work_id: work }]);
  });

  it('ignores topics that only look like reviews and unpublished or removed reviews', async () => {
    await asUser(ana, "insert into topics(work_id, title, body) values ($1, 'Resenha de @ana', 'falsa')", [work]);
    await publish(ana, work);
    await asUser(ana, 'select unpublish_review($1)', [work]);
    const r2 = await publish(ana, work2);
    expect(await reviews(bia, ana)).toEqual([{ topic_id: r2, work_id: work2 }]);
    await asSuperuser('update topics set deleted_at = now() where id = $1', [r2]);
    expect(await reviews(bia, ana)).toEqual([]);
  });

  it('is empty when there is a block either way', async () => {
    await publish(ana, work);
    await asUser(ana, 'insert into blocks(blocked_id) values ($1)', [bia]);
    expect(await reviews(bia, ana)).toEqual([]);
    expect(await reviews(ana, ana)).toHaveLength(1);
  });

  it('is for members only', async () => {
    await publish(ana, work);
    await expectDbError(asAnon('select * from profile_reviews($1)', [ana]), /permission denied/);
  });
});
