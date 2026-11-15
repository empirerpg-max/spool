import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, createUser, expectDbError } from './harness';

type Id = { id: string };

describe.skipIf(!hasDb)('lists', () => {
  let work: string;
  let ana: string;
  let bia: string;
  let adm: string;

  const named = async (email: string, username: string) => {
    const id = await createUser(email);
    await asSuperuser('update profiles set username = $2 where id = $1', [id, username]);
    return id;
  };
  const saveReview = (who: string, review: string | null, spoiler = false) =>
    asUser(who, `insert into list_items(work_id, status, rating, review, review_has_spoiler) values ($1, 'concluido', 4.5, $2, $3)
                 on conflict (user_id, work_id) do update set status = 'concluido', review = excluded.review, review_has_spoiler = excluded.review_has_spoiler`,
      [work, review, spoiler]);
  const publish = async (who: string) => (await asUser<{ id: string }>(who, 'select publish_review($1) as id', [work]))[0].id;
  const item = async (who: string) => (await asSuperuser<{ review: string | null; review_topic_id: string | null }>(
    'select review, review_topic_id from list_items where user_id = $1 and work_id = $2', [who, work]))[0];

  beforeEach(async () => {
    await resetDatabase();
    [{ id: work }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
    ana = await named('ana@example.com', 'ana');
    bia = await named('bia@example.com', 'bia');
    adm = await named('adm@example.com', 'adm');
    await asSuperuser('update profiles set is_admin = true where id = $1', [adm]);
  });

  it('add, change and remove own list item', async () => {
    await asUser(ana, "insert into list_items(work_id, status) values ($1, 'quero')", [work]);
    await asUser(ana, "update list_items set status = 'concluido', rating = 4.5 where work_id = $1", [work]);
    expect(await asUser(ana, 'select status, rating from list_items')).toEqual([{ status: 'concluido', rating: '4.5' }]);
    await asUser(ana, 'delete from list_items where work_id = $1', [work]);
    expect(await asUser(ana, 'select * from list_items')).toEqual([]);
  });

  it('list is private', async () => {
    await asUser(ana, "insert into list_items(work_id, status) values ($1, 'quero')", [work]);
    expect(await asUser(bia, 'select * from list_items')).toEqual([]);
    await asUser(bia, "update list_items set status = 'andamento' where work_id = $1", [work]);
    await asUser(bia, 'delete from list_items where work_id = $1', [work]);
    expect(await asUser(ana, 'select status from list_items')).toEqual([{ status: 'quero' }]);
    await expect(asAnon('select * from list_items')).rejects.toThrow(/permission denied/);
  });

  it('rating rules', async () => {
    for (const r of [4.3, 0, 5.5]) {
      await expectDbError(asUser(ana, "insert into list_items(work_id, status, rating) values ($1, 'concluido', $2)", [work, r]), /check constraint/);
    }
    await expectDbError(asUser(ana, "insert into list_items(work_id, status, rating) values ($1, 'quero', 4)", [work]), /check constraint/);
    await expectDbError(asUser(ana, "insert into list_items(work_id, status, review) values ($1, 'andamento', 'x')", [work]), /check constraint/);
  });

  it('cannot set review_topic_id or user_id directly', async () => {
    await expectDbError(asUser(ana, "insert into list_items(work_id, status, review_topic_id) values ($1, 'quero', gen_random_uuid())", [work]), /permission denied/);
    await expectDbError(asUser(ana, "insert into list_items(user_id, work_id, status) values ($1, $2, 'quero')", [bia, work]), /permission denied/);
  });

  it('publish creates a community topic', async () => {
    await saveReview(ana, 'Obra-prima', true);
    const topic = await publish(ana);
    expect(await asAnon('select title, body, has_spoiler, author_id from topics where id = $1', [topic]))
      .toEqual([{ title: 'Resenha de @ana', body: 'Obra-prima', has_spoiler: true, author_id: ana }]);
    expect((await item(ana)).review_topic_id).toBe(topic);
  });

  it('publishing twice updates the same topic', async () => {
    await saveReview(ana, 'Primeira');
    const first = await publish(ana);
    expect(await publish(ana)).toBe(first);
    expect(await asAnon('select count(*)::int as n from topics')).toEqual([{ n: 1 }]);
  });

  it('editing a published review updates the topic', async () => {
    await saveReview(ana, 'Antes');
    const topic = await publish(ana);
    await asUser(ana, "update list_items set review = 'Depois', review_has_spoiler = true where work_id = $1", [work]);
    expect(await asAnon('select body, has_spoiler from topics where id = $1', [topic])).toEqual([{ body: 'Depois', has_spoiler: true }]);
  });

  it('clearing the review unpublishes', async () => {
    await saveReview(ana, 'Antes');
    await publish(ana);
    await asUser(ana, 'update list_items set review = null where work_id = $1', [work]);
    expect(await asAnon('select id from topics')).toEqual([]);
    expect((await item(ana)).review_topic_id).toBeNull();
  });

  it('unpublish keeps the review', async () => {
    await saveReview(ana, 'Guardada');
    await publish(ana);
    await asUser(ana, 'select unpublish_review($1)', [work]);
    expect(await asAnon('select id from topics')).toEqual([]);
    expect(await item(ana)).toEqual({ review: 'Guardada', review_topic_id: null });
  });

  it('republishing after unpublish creates a fresh topic', async () => {
    await saveReview(ana, 'Volta');
    const first = await publish(ana);
    await asUser(ana, 'select unpublish_review($1)', [work]);
    const second = await publish(ana);
    expect(second).not.toBe(first);
    expect(await asAnon('select id from topics')).toEqual([{ id: second }]);
  });

  it('deleting the list item unpublishes', async () => {
    await saveReview(ana, 'Tchau');
    await publish(ana);
    await asUser(ana, 'delete from list_items where work_id = $1', [work]);
    expect(await asAnon('select id from topics')).toEqual([]);
  });

  it('publish respects community rules', async () => {
    await asUser(ana, "insert into list_items(work_id, status) values ($1, 'concluido')", [work]);
    await expectDbError(publish(ana), 'no_review');

    await asUser(adm, "select add_blocked_domain('pirata.example')");
    await saveReview(ana, 'baixe em pirata.example');
    await expectDbError(publish(ana), 'blocked_link');
    expect((await item(ana)).review).toBe('baixe em pirata.example');

    await saveReview(ana, 'ok');
    await asSuperuser('update profiles set banned_at = now() where id = $1', [ana]);
    await expectDbError(publish(ana), 'banned');
    expect((await item(ana)).review).toBe('ok');
  });

  it('only the owner can publish their own review', async () => {
    await saveReview(ana, 'Minha');
    await expectDbError(publish(bia), 'no_review');
  });

  it('imports are private', async () => {
    const [{ id: imp }] = await asUser<Id>(ana, "insert into imports(source) values ('letterboxd') returning id");
    await asUser(ana, "insert into import_items(import_id, position, row) values ($1, 0, '{}')", [imp]);
    expect(await asUser(bia, 'select * from imports')).toEqual([]);
    expect(await asUser(bia, 'select * from import_items')).toEqual([]);
    await expectDbError(asUser(bia, "insert into import_items(import_id, position, row) values ($1, 1, '{}')", [imp]), /row-level security/);
    await asUser(ana, "update import_items set state = 'importado', work_id = $2 where import_id = $1", [imp, work]);
    expect(await asUser(ana, 'select state from import_items')).toEqual([{ state: 'importado' }]);
  });

  it('editing a published review to add a blocked link keeps the edit and unpublishes', async () => {
    await saveReview(ana, 'Bom filme');
    await publish(ana);
    await asUser(adm, "select add_blocked_domain('pirata.example')");
    await asUser(ana, "update list_items set review = 'veja em pirata.example' where work_id = $1", [work]);
    expect(await item(ana)).toEqual({ review: 'veja em pirata.example', review_topic_id: null });
    expect(await asAnon('select id from topics')).toEqual([]);
    await expectDbError(publish(ana), 'blocked_link');
  });

  it('a review removed by moderation stays removed', async () => {
    await saveReview(ana, 'Original');
    const topic = await publish(ana);
    await asUser(bia, "insert into reports(topic_id, reason) values ($1, 'ofensa')", [topic]);
    const [{ id: rep }] = await asSuperuser<Id>('select id from reports');
    await asUser(adm, "select resolve_report($1, 'remover')", [rep]);

    await asUser(ana, "update list_items set review = 'Editada depois' where work_id = $1", [work]);
    expect(await asSuperuser('select body from topics where id = $1', [topic])).toEqual([{ body: 'Original' }]);
    expect((await item(ana)).review_topic_id).toBe(topic);
    await expectDbError(publish(ana), 'review_removed');
    await asUser(ana, 'select unpublish_review($1)', [work]);
    expect((await item(ana)).review_topic_id).toBe(topic);
    await expectDbError(publish(ana), 'review_removed');
    expect(await asSuperuser('select count(*)::int as n from topics where deleted_at is null')).toEqual([{ n: 0 }]);
  });

  it('a banned person cannot change their published review topic', async () => {
    await saveReview(ana, 'Antes');
    const topic = await publish(ana);
    await asSuperuser('update profiles set banned_at = now() where id = $1', [ana]);
    await asUser(ana, "update list_items set review = 'Depois do ban' where work_id = $1", [work]);
    expect(await asSuperuser('select body from topics where id = $1', [topic])).toEqual([{ body: 'Antes' }]);
    await expectDbError(publish(ana), 'banned');
  });

  it('import items track failed attempts', async () => {
    const [{ id: imp }] = await asUser<Id>(ana, "insert into imports(source) values ('letterboxd') returning id");
    await asUser(ana, "insert into import_items(import_id, position, row) values ($1, 0, '{}')", [imp]);
    await asUser(ana, 'update import_items set attempts = attempts + 1 where import_id = $1', [imp]);
    expect(await asUser(ana, 'select attempts from import_items')).toEqual([{ attempts: 1 }]);
  });
});
