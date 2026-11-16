import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, createUser, expectDbError } from './harness';

type Id = { id: string };

describe.skipIf(!hasDb)('active_communities', () => {
  let matrix: string;
  let duna: string;
  let velho: string;
  let ana: string;

  beforeEach(async () => {
    await resetDatabase();
    const work = async (ext: string, title: string) =>
      (await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', $1, $2) returning id", [ext, title]))[0].id;
    matrix = await work('603', 'Matrix');
    duna = await work('438631', 'Duna');
    velho = await work('1', 'Velho');
    ana = await createUser('ana@example.com');
    await asSuperuser("update profiles set username = 'ana' where id = $1", [ana]);
  });

  const topic = (workId: string) => asUser(ana, "insert into topics(work_id, title, body) values ($1, 'Oi gente', 'Texto')", [workId]);
  const post = (workId: string) => asUser(ana, "insert into social_posts(work_id, caption) values ($1, 'Legenda')", [workId]);
  const active = () => asUser<{ work_id: string; topics: number; posts: number }>(ana, 'select work_id, topics, posts from active_communities(5)');

  it('ranks works by topics and posts of the last 7 days', async () => {
    await topic(matrix);
    await post(duna);
    await post(duna);
    await topic(velho);
    await asSuperuser("update topics set created_at = now() - interval '8 days' where work_id = $1", [velho]);
    expect(await active()).toEqual([
      { work_id: duna, topics: 0, posts: 2 },
      { work_id: matrix, topics: 1, posts: 0 },
    ]);
  });

  it('ignores removed content', async () => {
    await topic(matrix);
    await post(duna);
    await asSuperuser('update topics set deleted_at = now()');
    await asSuperuser('update social_posts set deleted_at = now()');
    expect(await active()).toEqual([]);
  });

  it('is for members only', async () => {
    await expectDbError(asAnon('select * from active_communities(5)'), /permission denied/);
  });
});
