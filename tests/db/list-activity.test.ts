import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, createUser, expectDbError } from './harness';

type Id = { id: string };
type Item = { item_type: string; item_id: string; actor_id: string; work_id: string };
type Detail = { id: string; status: string; rating: string | null };

describe.skipIf(!hasDb)('list activity in the timeline', () => {
  let film: string;
  let book: string;
  let ana: string;
  let bia: string;
  let cris: string;

  const named = async (email: string, username: string) => {
    const id = await createUser(email);
    await asSuperuser('update profiles set username = $2 where id = $1', [id, username]);
    return id;
  };
  const follow = (who: string, whom: string) => asUser(who, 'insert into follows(followee_id) values ($1)', [whom]);
  const share = (who: string, activity: boolean | null, ratings = false) =>
    asUser(who, 'update profile_details set share_activity = $2, share_ratings = $3 where id = $1', [who, activity, ratings]);
  const add = async (who: string, workId: string, status: string, rating: number | null = null) =>
    (await asUser<Id>(who, 'insert into list_items(work_id, status, rating) values ($1, $2, $3) returning id', [workId, status, rating]))[0].id;
  // Skips the follow rules (signed-in, not blocked) to check the reading side on its own.
  const forceFollow = (who: string, whom: string) =>
    asSuperuser(`alter table follows disable trigger user;
      insert into follows(follower_id, followee_id) values ('${who}', '${whom}') on conflict do nothing;
      alter table follows enable trigger user`);
  const timeline = (who: string) =>
    asUser<Item>(who, 'select item_type, item_id, actor_id, work_id from timeline()');
  const listItems = async (who: string) => (await timeline(who)).filter((i) => i.item_type === 'list');
  const details = (who: string, ids: string[]) =>
    asUser<Detail>(who, 'select id, status, rating::text from timeline_list_details($1::uuid[])', [ids]);

  beforeEach(async () => {
    await resetDatabase();
    [{ id: film }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
    [{ id: book }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('book', 'b1', 'Torto Arado') returning id");
    ana = await named('ana@example.com', 'ana');
    bia = await named('bia@example.com', 'bia');
    cris = await named('cris@example.com', 'cris');
    await follow(ana, bia);
  });

  describe('settings', () => {
    it('start unanswered (null) and ratings off; each member changes only their own', async () => {
      expect(await asUser(bia, 'select share_activity, share_ratings from profile_details where id = $1', [bia]))
        .toEqual([{ share_activity: null, share_ratings: false }]);
      await share(bia, true, true);
      expect(await asUser(bia, 'select share_activity, share_ratings from profile_details where id = $1', [bia]))
        .toEqual([{ share_activity: true, share_ratings: true }]);
      await asUser(cris, 'update profile_details set share_activity = true where id = $1', [ana]);
      expect(await asSuperuser('select share_activity from profile_details where id = $1', [ana])).toEqual([{ share_activity: null }]);
    });

    it('banned members cannot change them', async () => {
      await asSuperuser('update profiles set banned_at = now() where id = $1', [bia]);
      await expectDbError(share(bia, true), 'banned');
    });
  });

  describe('status_changed_at', () => {
    it('is set on insert and when the status changes, not when only the rating or review changes (Review Focus 5)', async () => {
      await add(bia, film, 'andamento');
      const at = async () => (await asSuperuser<{ t: string }>('select status_changed_at::text as t from list_items where work_id = $1', [film]))[0].t;
      const first = await at();
      expect(first).toBeTruthy();
      await asUser(bia, "update list_items set status = 'concluido' where work_id = $1", [film]);
      const second = await at();
      expect(second > first).toBe(true);
      await asUser(bia, "update list_items set rating = 4, review = 'Bom' where work_id = $1", [film]);
      await asUser(bia, "update list_items set status = 'concluido' where work_id = $1", [film]);
      expect(await at()).toBe(second);
    });

    it('members cannot set it themselves', async () => {
      await expectDbError(
        asUser(bia, "insert into list_items(work_id, status, status_changed_at) values ($1, 'quero', '2000-01-01')", [film]),
        /permission denied/,
      );
      await add(bia, film, 'quero');
      await expectDbError(asUser(bia, "update list_items set status_changed_at = '2000-01-01' where work_id = $1", [film]), /permission denied/);
    });

    it('existing items are backfilled from their last update', async () => {
      let old: string | undefined;
      await resetDatabase({
        seedBefore: '20261128000000',
        seed: async () => {
          [{ id: film }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
          old = await createUser('old@example.com');
          await asSuperuser("insert into list_items(user_id, work_id, status, updated_at) values ($1, $2, 'quero', '2026-01-02 03:04:05+00')", [old, film]);
        },
      });
      expect(await asSuperuser<{ t: string }>("select to_char(status_changed_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') as t, (id is not null) as has_id from list_items where user_id = $1", [old]))
        .toEqual([{ t: '2026-01-02 03:04:05', has_id: true }]);
    });
  });

  describe('timeline', () => {
    it('shows nothing from someone who never answered or said no (Review Focus 1)', async () => {
      await add(bia, film, 'concluido', 4.5);
      expect(await listItems(ana)).toEqual([]);
      await share(bia, false, true);
      expect(await listItems(ana)).toEqual([]);
    });

    it('shows followees who allowed it, one item per list item, mixed with posts newest first', async () => {
      await share(bia, true);
      const i1 = await add(bia, film, 'quero');
      const [{ id: post }] = await asUser<Id>(bia, "insert into social_posts(work_id, caption) values ($1, 'Vamos?') returning id", [film]);
      const i2 = await add(bia, book, 'andamento');
      await add(cris, film, 'concluido'); // not followed
      await share(cris, true);
      expect(await timeline(ana)).toEqual([
        { item_type: 'list', item_id: i2, actor_id: bia, work_id: book },
        { item_type: 'post', item_id: post, actor_id: bia, work_id: film },
        { item_type: 'list', item_id: i1, actor_id: bia, work_id: film },
      ]);
      // Changing the status moves the item to the top.
      await asUser(bia, "update list_items set status = 'concluido' where work_id = $1", [film]);
      expect((await timeline(ana)).map((i) => i.item_id)).toEqual([i1, i2, post]);
      // My own list never shows up in my timeline.
      await share(ana, true);
      await add(ana, film, 'quero');
      expect(await listItems(ana)).toHaveLength(2);
    });

    it('rating or review changes do not create a new item (Review Focus 5)', async () => {
      await share(bia, true);
      const i = await add(bia, film, 'concluido');
      const j = await add(bia, book, 'quero');
      await asUser(bia, "update list_items set rating = 5, review = 'Uau' where work_id = $1", [film]);
      await asUser(bia, "update list_items set finished_on = '2026-11-01' where work_id = $1", [film]);
      expect((await listItems(ana)).map((x) => x.item_id)).toEqual([j, i]);
    });

    it('hides blocked (either way) and muted people (Review Focus 3)', async () => {
      await share(bia, true);
      const i = await add(bia, film, 'concluido', 4);
      await asUser(ana, 'insert into mutes(muted_id) values ($1)', [bia]);
      expect(await listItems(ana)).toEqual([]);
      expect(await details(ana, [i])).toEqual([]);
      await asUser(ana, 'delete from mutes');
      expect(await listItems(ana)).toHaveLength(1);
      await asUser(bia, 'insert into blocks(blocked_id) values ($1)', [ana]);
      expect(await listItems(ana)).toEqual([]);
      expect(await details(ana, [i])).toEqual([]);
      // Even if a follow somehow survived the block.
      await forceFollow(ana, bia);
      expect(await listItems(ana)).toEqual([]);
      expect(await details(ana, [i])).toEqual([]);
      await asSuperuser('delete from blocks; delete from follows');
      await follow(ana, bia);
      await asUser(ana, 'insert into blocks(blocked_id) values ($1)', [bia]);
      await forceFollow(ana, bia);
      expect(await listItems(ana)).toEqual([]);
      expect(await details(ana, [i])).toEqual([]);
    });

    it('leaves out imported items (Review Focus 4)', async () => {
      await share(bia, true);
      const [imp] = await asUser<Id>(bia, "insert into imports(source) values ('letterboxd') returning id");
      for (let n = 0; n < 500; n++) {
        await asSuperuser("insert into works(kind, external_id, title) values ('movie', $1, $1)", [`imp${n}`]);
      }
      await asSuperuser(
        `with w as (select id, row_number() over (order by external_id) as n from works where external_id like 'imp%')
         insert into list_items(user_id, work_id, status) select $1, id, 'concluido' from w`,
        [bia],
      );
      await asSuperuser(
        `insert into import_items(import_id, position, row, state, work_id)
         select $1, row_number() over (order by external_id), '{}', 'importado', id from works where external_id like 'imp%'`,
        [imp.id],
      );
      const own = await add(bia, film, 'quero');
      expect((await listItems(ana)).map((i) => i.item_id)).toEqual([own]);
      // Someone else's import of the same work does not hide it.
      const [other] = await asUser<Id>(cris, "insert into imports(source) values ('letterboxd') returning id");
      await asSuperuser("insert into import_items(import_id, position, row, state, work_id) values ($1, 0, '{}', 'importado', $2)", [other.id, film]);
      expect((await listItems(ana)).map((i) => i.item_id)).toEqual([own]);
      // A row that was not found does not hide it either.
      await asSuperuser("insert into import_items(import_id, position, row, state, work_id) values ($1, 9999, '{}', 'nao_encontrado', $2)", [imp.id, film]);
      expect((await listItems(ana)).map((i) => i.item_id)).toEqual([own]);
    });

    it('pages with the cursor across posts and list items', async () => {
      await share(bia, true);
      const ids: string[] = [];
      ids.push(await add(bia, film, 'quero'));
      ids.push((await asUser<Id>(bia, "insert into social_posts(work_id, caption) values ($1, 'x') returning id", [film]))[0].id);
      ids.push(await add(bia, book, 'quero'));
      const first = await asUser<{ item_id: string; created_at: string }>(ana, 'select item_id, created_at::text from timeline(null, 2)');
      expect(first.map((i) => i.item_id)).toEqual([ids[2], ids[1]]);
      const next = await asUser<{ item_id: string }>(ana, 'select item_id from timeline($1, 2, $2)', [first[1].created_at, first[1].item_id]);
      expect(next.map((i) => i.item_id)).toEqual([ids[0]]);
    });
  });

  describe('timeline_list_details', () => {
    it('returns the status, and the rating only when ratings are shared (Review Focus 2)', async () => {
      await share(bia, true);
      const i = await add(bia, film, 'concluido', 4.5);
      const j = await add(bia, book, 'andamento');
      const sorted = async () => (await details(ana, [i, j])).sort((a, b) => a.status.localeCompare(b.status));
      expect(await sorted()).toEqual([{ id: j, status: 'andamento', rating: null }, { id: i, status: 'concluido', rating: null }]);
      await share(bia, true, true);
      expect(await sorted()).toEqual([{ id: j, status: 'andamento', rating: null }, { id: i, status: 'concluido', rating: '4.5' }]);
      // Never the review.
      const cols = await asUser<Record<string, unknown>>(ana, 'select * from timeline_list_details($1::uuid[])', [[i]]);
      expect(Object.keys(cols[0]).sort()).toEqual(['id', 'rating', 'status']);
    });

    it('returns nothing for people who did not allow it, are not followed, or imported items', async () => {
      const i = await add(bia, film, 'concluido', 4.5);
      await asUser(bia, 'update profile_details set share_ratings = true where id = $1', [bia]);
      expect(await details(ana, [i])).toEqual([]); // never answered
      await share(bia, false, true);
      expect(await details(ana, [i])).toEqual([]);
      await share(bia, true, true);
      expect(await details(cris, [i])).toEqual([]); // cris does not follow bia
      const [imp] = await asUser<Id>(bia, "insert into imports(source) values ('goodreads') returning id");
      await asSuperuser("insert into import_items(import_id, position, row, state, work_id) values ($1, 0, '{}', 'importado', $2)", [imp.id, film]);
      expect(await details(ana, [i])).toEqual([]);
    });

    it('is denied to visitors, like the timeline', async () => {
      await expectDbError(asAnon('select * from timeline_list_details(array[]::uuid[])'), /permission denied/);
      await expectDbError(asAnon('select * from timeline()'), /permission denied/);
      expect(await asUser(ana, 'select * from timeline_list_details(null)')).toEqual([]);
    });
  });
});
