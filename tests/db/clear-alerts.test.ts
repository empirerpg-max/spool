import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, asServiceRole, createUser, expectDbError } from './harness';

type Id = { id: string };

describe.skipIf(!hasDb)('clear_my_alerts', () => {
  let movie: string;
  let ana: string;
  let bia: string;

  beforeEach(async () => {
    await resetDatabase();
    [{ id: movie }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
    ana = await createUser('ana@example.com');
    bia = await createUser('bia@example.com');
    await asSuperuser("update profiles set username = 'ana' where id = $1", [ana]);
    await asSuperuser("update profiles set username = 'bia' where id = $1", [bia]);
    for (const who of [ana, bia]) await asUser(who, 'insert into list_items(work_id, status) values ($1, $2)', [movie, 'quero']);
    await asServiceRole("select record_event($1, 'cinema', 'cinema:x', 'Título', null, '/obra/filme/603')", [movie]);
    await asUser(bia, 'insert into follows(followee_id) values ($1)', [ana]);
  });

  it('removes only my list alerts and social alerts', async () => {
    expect(await asUser(ana, 'select unread_count() as n')).toEqual([{ n: 2 }]);
    await asUser(ana, 'select clear_my_alerts()');
    expect(await asUser(ana, 'select count(*)::int as n from notifications')).toEqual([{ n: 0 }]);
    expect(await asUser(ana, 'select count(*)::int as n from activity')).toEqual([{ n: 0 }]);
    expect(await asUser(ana, 'select unread_count() as n')).toEqual([{ n: 0 }]);
    expect(await asUser(bia, 'select count(*)::int as n from notifications')).toEqual([{ n: 1 }]);
  });

  it('visitors cannot call it', async () => {
    await expectDbError(asAnon('select clear_my_alerts()'), 'permission denied');
  });
});
