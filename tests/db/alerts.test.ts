import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, asServiceRole, createUser, expectDbError } from './harness';

type Id = { id: string };

describe.skipIf(!hasDb)('alerts', () => {
  let movie: string;
  let series: string;
  let ana: string;
  let bia: string;
  let cris: string;

  const list = (who: string, work: string, status: string) =>
    asUser(who, 'insert into list_items(work_id, status) values ($1, $2)', [work, status]);
  const record = (work: string, kind: string, key: string) =>
    asServiceRole<{ n: number }>("select record_event($1, $2, $3, 'Título', null, '/obra/filme/603') as n", [work, kind, key]);

  beforeEach(async () => {
    await resetDatabase();
    [{ id: movie }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
    [{ id: series }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('series', '1399', 'GoT') returning id");
    ana = await createUser('ana@example.com');
    bia = await createUser('bia@example.com');
    cris = await createUser('cris@example.com');
  });

  it('notifies list members who have not finished the work', async () => {
    await list(ana, movie, 'quero');
    await list(bia, movie, 'concluido');
    expect(await record(movie, 'streaming', 'streaming:x:Max:2026-11-16')).toEqual([{ n: 1 }]);
    expect(await asUser(ana, 'select count(*)::int as n from notifications')).toEqual([{ n: 1 }]);
    expect(await asUser(bia, 'select count(*)::int as n from notifications')).toEqual([{ n: 0 }]);
    expect(await asUser(cris, 'select count(*)::int as n from notifications')).toEqual([{ n: 0 }]);
  });

  it('new seasons reach everyone who has the series, even if finished', async () => {
    await list(ana, series, 'concluido');
    await list(bia, series, 'andamento');
    expect(await record(series, 'temporada_estreia', 'temporada_estreia:x:9')).toEqual([{ n: 2 }]);
  });

  it('the same event never notifies twice', async () => {
    await list(ana, movie, 'quero');
    await record(movie, 'cinema', 'cinema:x');
    expect(await record(movie, 'cinema', 'cinema:x')).toEqual([{ n: 0 }]);
    expect(await asSuperuser('select count(*)::int as n from events')).toEqual([{ n: 1 }]);
    expect(await asUser(ana, 'select count(*)::int as n from notifications')).toEqual([{ n: 1 }]);
  });

  it('removing the work before the check means no alert', async () => {
    await list(ana, movie, 'quero');
    await asUser(ana, 'delete from list_items where work_id = $1', [movie]);
    expect(await record(movie, 'cinema', 'cinema:y')).toEqual([{ n: 0 }]);
  });

  it('people only see and change their own alerts', async () => {
    await list(ana, movie, 'quero');
    await list(bia, movie, 'quero');
    await record(movie, 'cinema', 'cinema:z');
    expect(await asUser(ana, 'select unread_count() as n')).toEqual([{ n: 1 }]);
    await asUser(ana, 'select mark_notifications_read()');
    expect(await asUser(ana, 'select unread_count() as n')).toEqual([{ n: 0 }]);
    expect(await asUser(bia, 'select unread_count() as n')).toEqual([{ n: 1 }]);
    await expectDbError(asUser(ana, 'insert into notifications(user_id, event_id) select $1, id from events', [ana]), /permission denied/);
    await expectDbError(asUser(ana, 'update notifications set pushed_at = now()'), /permission denied/);
    await expectDbError(asAnon('select * from notifications'), /permission denied/);
  });

  it('only the server records events and reads push keys', async () => {
    await expectDbError(asUser(ana, "select record_event($1, 'cinema', 'k', 't', null, '/')", [movie]), /permission denied/);
    await expectDbError(asUser(ana, 'select * from push_keys'), /permission denied/);
    await asServiceRole("insert into push_keys(public_key, private_key) values ('pub', 'priv')");
    expect(await asServiceRole('select public_key from push_keys')).toEqual([{ public_key: 'pub' }]);
  });

  it('push subscriptions are private to their owner', async () => {
    await asUser(ana, "insert into push_subscriptions(endpoint, p256dh, auth) values ('https://push.example/1', 'k', 'a')");
    expect(await asUser(bia, 'select * from push_subscriptions')).toEqual([]);
    expect(await asUser(ana, 'select endpoint from push_subscriptions')).toEqual([{ endpoint: 'https://push.example/1' }]);
    await expectDbError(asUser(bia, "insert into push_subscriptions(user_id, endpoint, p256dh, auth) values ($1, 'https://push.example/2', 'k', 'a')", [ana]), /permission denied/);
    await asUser(bia, "delete from push_subscriptions where endpoint = 'https://push.example/1'");
    expect(await asUser(ana, 'select count(*)::int as n from push_subscriptions')).toEqual([{ n: 1 }]);
  });

  it('works remember the day they were last checked', async () => {
    await asSuperuser("update works set checked_on = '2026-11-16' where id = $1", [movie]);
    expect(await asAnon('select checked_on::text from works where id = $1', [movie])).toEqual([{ checked_on: '2026-11-16' }]);
  });

  it('people can read the events of their own alerts only', async () => {
    await list(ana, movie, 'quero');
    await asServiceRole("select record_event($1, 'cinema', 'k1', 'Matrix estreou', null, '/obra/filme/603')", [movie]);
    await list(bia, series, 'quero');
    await asServiceRole("select record_event($1, 'temporada_estreia', 'k2', 'GoT voltou', null, '/obra/serie/1399')", [series]);
    expect(await asUser(ana, 'select e.title from notifications n join events e on e.id = n.event_id')).toEqual([{ title: 'Matrix estreou' }]);
    expect(await asUser(ana, 'select title from events')).toEqual([{ title: 'Matrix estreou' }]);
  });

  it('due works are those in some list not checked today', async () => {
    await list(ana, movie, 'quero');
    await list(bia, series, 'concluido');
    await asSuperuser("update works set checked_on = '2026-11-16' where id = $1", [series]);
    expect(await asServiceRole("select id from due_works('2026-11-16', 10)")).toEqual([{ id: movie }]);
    expect(await asServiceRole("select due_works_count('2026-11-16') as n")).toEqual([{ n: 1 }]);
    await expectDbError(asUser(ana, "select * from due_works('2026-11-16', 10)"), /permission denied/);
  });
});
