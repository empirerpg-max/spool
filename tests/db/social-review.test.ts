import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, asServiceRole, createUser, expectDbError } from './harness';

type Id = { id: string };

/** Fixes from the review of the social club (profile privacy, bans, alerts, timeline paging, moderation). */
describe.skipIf(!hasDb)('social club — review fixes', () => {
  let work: string;
  let ana: string;
  let bia: string;
  let cris: string;
  let adm: string;

  const named = async (email: string, username: string) => {
    const id = await createUser(email);
    await asSuperuser('update profiles set username = $2 where id = $1', [id, username]);
    return id;
  };
  const follow = (who: string, whom: string) => asUser(who, 'insert into follows(followee_id) values ($1)', [whom]);
  const block = (who: string, whom: string) => asUser(who, 'insert into blocks(blocked_id) values ($1)', [whom]);
  const post = async (who: string, caption = 'Que filme!') =>
    (await asUser<Id>(who, 'insert into social_posts(work_id, caption) values ($1, $2) returning id', [work, caption]))[0].id;
  const reply = async (who: string, postId: string, body = 'Concordo') =>
    (await asUser<Id>(who, 'insert into social_replies(post_id, body) values ($1, $2) returning id', [postId, body]))[0].id;
  const like = (who: string, postId: string) => asUser(who, 'insert into social_likes(post_id) values ($1)', [postId]);
  const unlike = (who: string, postId: string) => asUser(who, 'delete from social_likes where post_id = $1', [postId]);
  const activity = (who: string) => asUser<{ kind: string; actor_id: string }>(who, 'select kind, actor_id from activity order by id');
  const unread = async (who: string) => (await asUser<{ n: number }>(who, 'select unread_count() as n'))[0].n;

  beforeEach(async () => {
    await resetDatabase();
    [{ id: work }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
    ana = await named('ana@example.com', 'ana');
    bia = await named('bia@example.com', 'bia');
    cris = await named('cris@example.com', 'cris');
    adm = await named('adm@example.com', 'adm');
    await asSuperuser('update profiles set is_admin = true where id = $1', [adm]);
  });

  describe('profile details', () => {
    it('every profile gets a details row; the extras are not columns of profiles', async () => {
      expect(await asUser(ana, 'select bio, avatar_url, list_public from profile_details where id = $1', [ana]))
        .toEqual([{ bio: null, avatar_url: null, list_public: false }]);
      expect(await asSuperuser(
        "select column_name from information_schema.columns where table_name = 'profiles' and column_name in ('bio', 'avatar_url', 'list_public')",
      )).toEqual([]);
    });

    it('members read them; visitors cannot', async () => {
      await asUser(ana, "update profile_details set bio = 'Cinéfila', list_public = true where id = $1", [ana]);
      expect(await asUser(bia, 'select bio, avatar_url, list_public from profile_details where id = $1', [ana]))
        .toEqual([{ bio: 'Cinéfila', avatar_url: null, list_public: true }]);
      await expectDbError(asAnon('select bio from profile_details'), /permission denied/);
      await expectDbError(asAnon('select avatar_url from profile_details'), /permission denied/);
    });

    it('a block either way hides them from the other side', async () => {
      await asUser(ana, "update profile_details set bio = 'Cinéfila' where id = $1", [ana]);
      await asUser(bia, "update profile_details set bio = 'Leitora' where id = $1", [bia]);
      await block(ana, bia);
      expect(await asUser(bia, 'select * from profile_details where id = $1', [ana])).toEqual([]);
      expect(await asUser(ana, 'select * from profile_details where id = $1', [bia])).toEqual([]);
      expect(await asUser(cris, 'select id from profile_details where id in ($1, $2)', [ana, bia])).toHaveLength(2);
      // Each one still sees their own.
      expect(await asUser(bia, 'select bio from profile_details where id = $1', [bia])).toEqual([{ bio: 'Leitora' }]);
    });

    it('people edit only their own bio and list setting; the photo is set only by the server', async () => {
      await asUser(bia, "update profile_details set bio = 'hack' where id = $1", [ana]);
      expect(await asSuperuser('select bio from profile_details where id = $1', [ana])).toEqual([{ bio: null }]);
      await expectDbError(asUser(ana, 'update profile_details set bio = $2 where id = $1', [ana, 'x'.repeat(161)]), /check constraint/);
      await expectDbError(asUser(ana, "update profile_details set avatar_url = 'https://x' where id = $1", [ana]), /permission denied/);
      await expectDbError(asUser(ana, 'insert into profile_details(id) values ($1)', [ana]), /permission denied/);
      await asServiceRole("update profile_details set avatar_url = 'https://cdn/a.webp' where id = $1", [ana]);
      expect(await asUser(bia, 'select avatar_url from profile_details where id = $1', [ana])).toEqual([{ avatar_url: 'https://cdn/a.webp' }]);
      expect(await asUser(bia, 'select avatar_url from suggested_people(8) where id = $1', [ana])).toEqual([{ avatar_url: 'https://cdn/a.webp' }]);
    });

    it('existing profiles get a details row when the change reaches the database', async () => {
      let old = '';
      await resetDatabase({
        seedBefore: '20261121000000',
        seed: async () => { old = await createUser('old@example.com'); },
      });
      expect(await asSuperuser('select list_public from profile_details where id = $1', [old])).toEqual([{ list_public: false }]);
    });
  });

  describe('banned members', () => {
    beforeEach(async () => {
      await asSuperuser('update profiles set banned_at = now() where id = $1', [ana]);
    });

    it('cannot change their bio, list setting or display name', async () => {
      await expectDbError(asUser(ana, "update profile_details set bio = 'oi' where id = $1", [ana]), 'banned');
      await expectDbError(asUser(ana, 'update profile_details set list_public = true where id = $1', [ana]), 'banned');
      await expectDbError(asUser(ana, "update profiles set display_name = 'Ana' where id = $1", [ana]), 'banned');
    });

    it('the server and admins still can', async () => {
      await asServiceRole("update profile_details set avatar_url = null where id = $1", [ana]);
      await asSuperuser("update profiles set display_name = 'Removido' where id = $1", [ana]);
      expect(await asSuperuser('select display_name from profiles where id = $1', [ana])).toEqual([{ display_name: 'Removido' }]);
    });
  });

  it('existing topics are followed by their authors', async () => {
    let topicId = '';
    await resetDatabase({
      seedBefore: '20261121000000',
      seed: async () => {
        const [{ id: w }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '1', 'Velho') returning id");
        const u = await createUser('autora@example.com');
        await asSuperuser("update profiles set username = 'autora' where id = $1", [u]);
        [{ id: topicId }] = await asUser<Id>(u, "insert into topics(work_id, title, body) values ($1, 'Antigo', 'Texto') returning id", [w]);
        await asUser<Id>(u, "insert into topics(work_id, title, body) values ($1, 'Removido', 'Texto') returning id", [w]);
        await asSuperuser("update topics set deleted_at = now() where title = 'Removido'");
      },
    });
    expect(await asSuperuser('select topic_id from watches')).toEqual([{ topic_id: topicId }]);
  });

  describe('alerts', () => {
    it('like/unlike or unfollow/follow does not repeat an alert within a day, even after reading', async () => {
      const p = await post(ana);
      await like(bia, p);
      await asUser(ana, 'select mark_activity_read()');
      await unlike(bia, p);
      await like(bia, p);
      await follow(bia, ana);
      await asUser(ana, 'select mark_activity_read()');
      await asUser(bia, 'delete from follows where followee_id = $1', [ana]);
      await follow(bia, ana);
      expect(await activity(ana)).toEqual([{ kind: 'like', actor_id: bia }, { kind: 'follow', actor_id: bia }]);
      // After a day, a new alert is fine.
      await asSuperuser("update activity set created_at = now() - interval '25 hours'");
      await asUser(bia, 'delete from follows where followee_id = $1', [ana]);
      await follow(bia, ana);
      expect(await activity(ana)).toHaveLength(3);
    });

    it('the bell does not count alerts about removed posts', async () => {
      const p = await post(ana);
      await reply(bia, p);
      await like(cris, p);
      expect(await unread(ana)).toBe(2);
      await asUser(ana, 'select delete_social_post($1)', [p]);
      expect(await unread(ana)).toBe(0);
    });

    it('the bell does not count alerts about removed topics', async () => {
      const [{ id: t }] = await asUser<Id>(ana, "insert into topics(work_id, title, body) values ($1, 'Sobre', 'Texto') returning id", [work]);
      await asUser(bia, "insert into posts(topic_id, body) values ($1, 'Concordo')", [t]);
      expect(await unread(ana)).toBe(1);
      await asSuperuser('update topics set deleted_at = now() where id = $1', [t]);
      expect(await unread(ana)).toBe(0);
    });
  });

  describe('timeline paging', () => {
    it('pages through items with the same time without skipping or repeating', async () => {
      await follow(ana, bia);
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) ids.push(await post(bia));
      await asSuperuser("update social_posts set created_at = '2026-11-16 12:00:00+00'");
      const seen: string[] = [];
      let cursor: { created_at: string; item_id: string } | null = null;
      for (let page = 0; page < 4; page++) {
        const rows: Array<{ item_id: string; created_at: string }> = await asUser(ana,
          'select item_id, created_at::text from timeline($1, 2, $2)', [cursor?.created_at ?? null, cursor?.item_id ?? null]);
        if (rows.length === 0) break;
        seen.push(...rows.map((r) => r.item_id));
        cursor = rows[rows.length - 1];
      }
      expect(seen).toHaveLength(5);
      expect(new Set(seen)).toEqual(new Set(ids));
      expect(seen).toEqual([...ids].sort().reverse());
    });
  });

  describe('moderation', () => {
    it('admins see reported posts and replies even with a block', async () => {
      const p = await post(bia);
      const r = await reply(cris, p);
      await block(bia, adm);
      await block(cris, adm);
      expect(await asUser(adm, 'select id from social_posts where id = $1', [p])).toEqual([{ id: p }]);
      expect(await asUser(adm, 'select id from social_replies where id = $1', [r])).toEqual([{ id: r }]);
      // Regular members still don't.
      await block(bia, ana);
      expect(await asUser(ana, 'select id from social_posts where id = $1', [p])).toEqual([]);
      expect(await asUser(ana, 'select id from social_replies where id = $1', [r])).toEqual([]);
    });
  });
});
