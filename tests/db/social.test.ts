import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, createUser, expectDbError } from './harness';

type Id = { id: string };
type Item = { item_type: string; item_id: string; actor_id: string };

describe.skipIf(!hasDb)('social club', () => {
  let work: string;
  let ana: string;
  let bia: string;
  let cris: string;
  let nameless: string;
  let adm: string;

  const named = async (email: string, username: string) => {
    const id = await createUser(email);
    await asSuperuser('update profiles set username = $2 where id = $1', [id, username]);
    return id;
  };
  const follow = (who: string, whom: string) => asUser(who, 'insert into follows(followee_id) values ($1)', [whom]);
  const block = (who: string, whom: string) => asUser(who, 'insert into blocks(blocked_id) values ($1)', [whom]);
  const mute = (who: string, whom: string) => asUser(who, 'insert into mutes(muted_id) values ($1)', [whom]);
  const post = async (who: string, caption = 'Que filme!') =>
    (await asUser<Id>(who, 'insert into social_posts(work_id, caption) values ($1, $2) returning id', [work, caption]))[0].id;
  const reply = async (who: string, postId: string, body = 'Concordo') =>
    (await asUser<Id>(who, 'insert into social_replies(post_id, body) values ($1, $2) returning id', [postId, body]))[0].id;
  const like = (who: string, postId: string) =>
    asUser(who, 'insert into social_likes(post_id) values ($1) on conflict do nothing', [postId]);
  const unlike = (who: string, postId: string) => asUser(who, 'delete from social_likes where post_id = $1', [postId]);
  const counts = async (postId: string) =>
    (await asSuperuser<{ like_count: number; reply_count: number }>('select like_count, reply_count from social_posts where id = $1', [postId]))[0];
  const topic = async (who: string) =>
    (await asUser<Id>(who, "insert into topics(work_id, title, body) values ($1, 'Sobre o final', 'Que final!') returning id", [work]))[0].id;
  const topicReply = async (who: string, topicId: string) =>
    (await asUser<Id>(who, "insert into posts(topic_id, body) values ($1, 'Concordo') returning id", [topicId]))[0].id;
  const report = async (who: string, target: { socialPostId?: string; socialReplyId?: string }) => {
    await asUser(who, "insert into reports(social_post_id, social_reply_id, reason) values ($1, $2, 'ofensa')", [
      target.socialPostId ?? null, target.socialReplyId ?? null,
    ]);
    const [row] = await asSuperuser<Id>(
      'select id from reports where reporter_id = $1 and social_post_id is not distinct from $2 and social_reply_id is not distinct from $3',
      [who, target.socialPostId ?? null, target.socialReplyId ?? null],
    );
    return row.id;
  };
  const timeline = (who: string, before: string | null = null, limit = 20) =>
    asUser<Item>(who, 'select item_type, item_id, actor_id from timeline($1, $2)', [before, limit]);
  const activity = (who: string) =>
    asUser<{ kind: string; actor_id: string }>(who, 'select kind, actor_id from activity order by id');

  beforeEach(async () => {
    await resetDatabase();
    [{ id: work }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
    ana = await named('ana@example.com', 'ana');
    bia = await named('bia@example.com', 'bia');
    cris = await named('cris@example.com', 'cris');
    nameless = await createUser('x@example.com');
    adm = await named('adm@example.com', 'adm');
    await asSuperuser('update profiles set is_admin = true where id = $1', [adm]);
  });

  describe('follows', () => {
    it('follow and unfollow', async () => {
      await follow(ana, bia);
      expect(await asUser(cris, 'select follower_id, followee_id from follows')).toEqual([{ follower_id: ana, followee_id: bia }]);
      await asUser(ana, 'delete from follows where followee_id = $1', [bia]);
      expect(await asUser(cris, 'select * from follows')).toEqual([]);
    });

    it('cannot follow yourself, twice, as someone else, or without a username', async () => {
      await expectDbError(follow(ana, ana), /check constraint/);
      await follow(ana, bia);
      await expectDbError(follow(ana, bia), /duplicate key/);
      await expectDbError(asUser(ana, 'insert into follows(follower_id, followee_id) values ($1, $2)', [bia, cris]), /permission denied/);
      await expectDbError(follow(nameless, bia), 'no_username');
    });

    it('cannot remove other people’s follows', async () => {
      await follow(ana, bia);
      await asUser(cris, 'delete from follows');
      expect(await asSuperuser('select count(*)::int as n from follows')).toEqual([{ n: 1 }]);
    });
  });

  describe('block', () => {
    it('removes follows both ways and prevents following again', async () => {
      await follow(ana, bia);
      await follow(bia, ana);
      await block(bia, ana);
      expect(await asSuperuser('select count(*)::int as n from follows')).toEqual([{ n: 0 }]);
      await expectDbError(follow(ana, bia), 'blocked');
      await expectDbError(follow(bia, ana), 'blocked');
    });

    it('hides posts, replies and follows both ways (Review Focus 1)', async () => {
      const p = await post(bia);
      const pc = await post(cris);
      await reply(bia, pc);
      await follow(bia, cris);
      await block(bia, ana);
      // The blocked person sees nothing of the blocker, even calling the API directly.
      expect(await asUser(ana, 'select id from social_posts where author_id = $1', [bia])).toEqual([]);
      expect(await asUser(ana, 'select id from social_replies where author_id = $1', [bia])).toEqual([]);
      expect(await asUser(ana, 'select * from follows where follower_id = $1 or followee_id = $1', [bia])).toEqual([]);
      expect(await asUser(ana, 'select * from social_likes where post_id = $1', [p])).toEqual([]);
      // ... and the blocker no longer sees the blocked person either.
      const pa = await post(ana);
      expect(await asUser(bia, 'select id from social_posts where id = $1', [pa])).toEqual([]);
      expect(await asUser(cris, 'select id from social_posts order by created_at')).toHaveLength(3);
      expect(await asUser(ana, 'select is_blocked($1, $2) as b', [ana, bia])).toEqual([{ b: true }]);
    });

    it('prevents liking and replying either way', async () => {
      const pb = await post(bia);
      const pa = await post(ana);
      await block(bia, ana);
      await expectDbError(like(ana, pb), 'blocked');
      await expectDbError(reply(ana, pb), 'blocked');
      await expectDbError(like(bia, pa), 'blocked');
      await expectDbError(reply(bia, pa), 'blocked');
      expect(await counts(pb)).toEqual({ like_count: 0, reply_count: 0 });
    });

    it('nobody else learns who blocked whom', async () => {
      await block(bia, ana);
      expect(await asUser(cris, 'select is_blocked($1, $2) as b', [ana, bia])).toEqual([{ b: false }]);
      expect(await asUser(ana, 'select * from blocks')).toEqual([]);
      expect(await asUser(cris, 'select * from blocks')).toEqual([]);
      expect(await asUser(bia, 'select blocked_id from blocks')).toEqual([{ blocked_id: ana }]);
    });

    it('unblocking allows following again', async () => {
      await block(bia, ana);
      await asUser(bia, 'delete from blocks where blocked_id = $1', [ana]);
      await follow(ana, bia);
      expect(await asUser(cris, 'select count(*)::int as n from follows')).toEqual([{ n: 1 }]);
    });

    it('does not apply inside work communities', async () => {
      const t = await topic(bia);
      await block(bia, ana);
      await topicReply(ana, t);
      expect(await asUser(ana, 'select id from topics where id = $1', [t])).toHaveLength(1);
    });
  });

  describe('mute', () => {
    it('hides from timeline and activity only', async () => {
      await follow(ana, bia);
      await mute(ana, bia);
      const p = await post(bia);
      const pa = await post(ana);
      await like(bia, pa);
      await follow(bia, ana);
      expect(await timeline(ana)).toEqual([]);
      expect(await activity(ana)).toEqual([]);
      // Everything else stays the same.
      expect(await asUser(ana, 'select id from social_posts where id = $1', [p])).toHaveLength(1);
      await like(ana, p);
      expect(await asUser(bia, 'select muted_id from mutes')).toEqual([]);
      expect(await asUser(ana, 'select muted_id from mutes')).toEqual([{ muted_id: bia }]);
    });
  });

  describe('posts, likes and replies', () => {
    it('member creates a post citing a work', async () => {
      const p = await post(ana);
      expect(await asUser(bia, 'select author_id, work_id, has_spoiler, like_count, reply_count from social_posts where id = $1', [p]))
        .toEqual([{ author_id: ana, work_id: work, has_spoiler: false, like_count: 0, reply_count: 0 }]);
    });

    it('community rules apply', async () => {
      await expectDbError(post(nameless), 'no_username');
      await expectDbError(post(ana, '   '), /check constraint/);
      await expectDbError(post(ana, 'x'.repeat(1001)), /check constraint/);
      await expectDbError(asUser(ana, "insert into social_posts(caption) values ('sem obra')"), /not-null|null value/);
      await asUser(adm, "select add_blocked_domain('pirata.example')");
      await expectDbError(post(ana, 'veja em pirata.example'), 'blocked_link');
      const p = await post(bia);
      await expectDbError(reply(ana, p, 'https://www.pirata.example/x'), 'blocked_link');
      await expectDbError(reply(ana, p, 'x'.repeat(2001)), /check constraint/);
    });

    it('rate limits posts and replies', async () => {
      for (let i = 0; i < 10; i++) await post(ana);
      await expectDbError(post(ana), 'rate_limited');
      const p = await post(bia);
      for (let i = 0; i < 30; i++) await reply(cris, p);
      await expectDbError(reply(cris, p), 'rate_limited');
    });

    it('users cannot set counters, authors or dates', async () => {
      await expectDbError(asUser(ana, "insert into social_posts(work_id, caption, like_count) values ($1, 'x', 99)", [work]), /permission denied/);
      await expectDbError(asUser(ana, "insert into social_posts(work_id, caption, author_id) values ($1, 'x', $2)", [work, bia]), /permission denied/);
      await expectDbError(asUser(ana, "insert into social_posts(work_id, caption, created_at) values ($1, 'x', '2000-01-01')", [work]), /permission denied/);
      const p = await post(ana);
      await expectDbError(asUser(ana, "update social_posts set caption = 'editado' where id = $1", [p]), /permission denied/);
      await expectDbError(asUser(ana, 'update social_posts set like_count = 99 where id = $1', [p]), /permission denied/);
    });

    it('liking twice or like/unlike quickly keeps the count right (Review Focus 2)', async () => {
      const p = await post(ana);
      await like(bia, p);
      await like(bia, p);
      expect(await counts(p)).toEqual({ like_count: 1, reply_count: 0 });
      await expectDbError(asUser(bia, 'insert into social_likes(post_id) values ($1)', [p]), /duplicate key/);
      await unlike(bia, p);
      await unlike(bia, p);
      expect(await counts(p)).toEqual({ like_count: 0, reply_count: 0 });
      await like(bia, p);
      await unlike(bia, p);
      await like(bia, p);
      await like(cris, p);
      expect(await counts(p)).toEqual({ like_count: 2, reply_count: 0 });
      expect(await asUser(bia, 'select user_id from social_likes where post_id = $1 and user_id = auth.uid()', [p])).toEqual([{ user_id: bia }]);
      await asUser(cris, 'delete from social_likes where user_id = $1', [bia]);
      expect(await counts(p)).toEqual({ like_count: 2, reply_count: 0 });
    });

    it('reply count follows replies and their removal by the author', async () => {
      const p = await post(ana);
      const r1 = await reply(bia, p);
      await reply(cris, p);
      expect(await counts(p)).toEqual({ like_count: 0, reply_count: 2 });
      await expectDbError(asUser(cris, 'select delete_social_reply($1)', [r1]), 'forbidden');
      await asUser(bia, 'select delete_social_reply($1)', [r1]);
      await asUser(bia, 'select delete_social_reply($1)', [r1]);
      expect(await counts(p)).toEqual({ like_count: 0, reply_count: 1 });
      expect(await asUser(cris, 'select id from social_replies where post_id = $1', [p])).toHaveLength(1);
    });

    it('author deletes own post; others cannot', async () => {
      const p = await post(ana);
      await expectDbError(asUser(bia, 'select delete_social_post($1)', [p]), 'forbidden');
      await asUser(ana, 'select delete_social_post($1)', [p]);
      expect(await asUser(bia, 'select id from social_posts')).toEqual([]);
      await expectDbError(reply(bia, p), 'post_closed');
    });

    it('visitors cannot read anything social', async () => {
      const p = await post(ana);
      await reply(bia, p);
      await like(bia, p);
      await follow(ana, bia);
      await block(ana, cris);
      await mute(ana, cris);
      for (const table of ['social_posts', 'social_replies', 'social_likes', 'follows', 'blocks', 'mutes', 'watches', 'activity']) {
        await expectDbError(asAnon(`select * from ${table}`), /permission denied/);
      }
      await expectDbError(asAnon('select * from timeline()'), /permission denied/);
      await expectDbError(asAnon('select * from suggested_people()'), /permission denied/);
      await expectDbError(asAnon("select * from public_list('ana')"), /permission denied/);
    });
  });

  describe('moderation', () => {
    it('removed post disappears everywhere and closes replies and likes (Review Focus 3)', async () => {
      await follow(cris, ana);
      const p = await post(ana);
      await reply(bia, p);
      const r = await report(bia, { socialPostId: p });
      await asUser(adm, "select resolve_report($1, 'remover')", [r]);
      expect(await asUser(ana, 'select id from social_posts where author_id = $1', [ana])).toEqual([]);
      expect(await asUser(cris, 'select id from social_posts where work_id = $1', [work])).toEqual([]);
      expect(await asUser(cris, 'select id from social_replies')).toEqual([]);
      expect(await timeline(cris)).toEqual([]);
      expect(await asUser(adm, 'select id from social_posts')).toHaveLength(1);
      await expectDbError(reply(cris, p), 'post_closed');
      await expectDbError(like(cris, p), 'post_closed');
      expect(await asUser(adm, 'select resolution from reports')).toEqual([{ resolution: 'removido' }]);
    });

    it('removing a reply decrements the count; ban works for social content', async () => {
      const p = await post(ana);
      const rr = await reply(bia, p);
      const r = await report(ana, { socialReplyId: rr });
      await asUser(adm, "select resolve_report($1, 'banir')", [r]);
      expect(await counts(p)).toEqual({ like_count: 0, reply_count: 0 });
      expect(await asUser(cris, 'select id from social_replies')).toEqual([]);
      await expectDbError(post(bia), 'banned');
      await expectDbError(follow(bia, ana), 'banned');
    });

    it('a report targets exactly one thing, once', async () => {
      const p = await post(ana);
      const rr = await reply(bia, p);
      await report(cris, { socialPostId: p });
      await expectDbError(report(cris, { socialPostId: p }), /duplicate key/);
      await expectDbError(report(cris, { socialPostId: p, socialReplyId: rr }), /check constraint/);
    });
  });

  describe('watches and activity', () => {
    it('creators watch what they create; people manage only their own watches', async () => {
      const p = await post(ana);
      const t = await topic(bia);
      expect(await asUser(ana, 'select social_post_id, topic_id from watches')).toEqual([{ social_post_id: p, topic_id: null }]);
      expect(await asUser(bia, 'select social_post_id, topic_id from watches')).toEqual([{ social_post_id: null, topic_id: t }]);
      await asUser(cris, 'insert into watches(topic_id) values ($1)', [t]);
      await asUser(cris, 'insert into watches(topic_id) values ($1) on conflict do nothing', [t]);
      await expectDbError(asUser(cris, 'insert into watches(topic_id, social_post_id) values ($1, $2)', [t, p]), /check constraint/);
      await asUser(cris, 'delete from watches');
      expect(await asSuperuser('select count(*)::int as n from watches')).toEqual([{ n: 2 }]);
    });

    it('follow, like and reply create alerts; own actions do not', async () => {
      await follow(bia, ana);
      const p = await post(ana);
      await like(bia, p);
      await like(ana, p);
      await reply(cris, p);
      await reply(ana, p);
      expect(await activity(ana)).toEqual([
        { kind: 'follow', actor_id: bia },
        { kind: 'like', actor_id: bia },
        { kind: 'reply', actor_id: cris },
      ]);
    });

    it('watchers get watched_reply; the author only gets reply', async () => {
      const p = await post(ana);
      await asUser(bia, 'insert into watches(social_post_id) values ($1)', [p]);
      await reply(cris, p);
      expect(await activity(ana)).toEqual([{ kind: 'reply', actor_id: cris }]);
      expect(await activity(bia)).toEqual([{ kind: 'watched_reply', actor_id: cris }]);
      expect(await activity(cris)).toEqual([]);
    });

    it('community replies alert topic watchers', async () => {
      const t = await topic(ana);
      await asUser(cris, 'insert into watches(topic_id) values ($1)', [t]);
      await topicReply(bia, t);
      expect(await activity(ana)).toEqual([{ kind: 'watched_reply', actor_id: bia }]);
      expect(await activity(cris)).toEqual([{ kind: 'watched_reply', actor_id: bia }]);
      expect(await activity(bia)).toEqual([]);
    });

    it('liking again after unliking does not repeat an unread alert', async () => {
      const p = await post(ana);
      await like(bia, p);
      await unlike(bia, p);
      await like(bia, p);
      expect(await activity(ana)).toEqual([{ kind: 'like', actor_id: bia }]);
    });

    it('blocked people send no alerts and old ones disappear', async () => {
      await follow(bia, ana);
      await block(ana, bia);
      expect(await activity(ana)).toEqual([]);
      const t = await topic(ana);
      await topicReply(bia, t);
      expect(await activity(ana)).toEqual([]);
    });

    it('unread count adds list alerts and social alerts; marking read clears social ones', async () => {
      await follow(bia, ana);
      const [{ id: ev }] = await asSuperuser<{ id: number }>(
        "insert into events(work_id, kind, dedupe_key, title, url) values ($1, 'cinema', 'k', 'T', '/x') returning id", [work]);
      await asSuperuser('insert into notifications(user_id, event_id) values ($1, $2)', [ana, ev]);
      expect(await asUser(ana, 'select unread_count() as n')).toEqual([{ n: 2 }]);
      await asUser(ana, 'select mark_activity_read()');
      expect(await asUser(ana, 'select unread_count() as n')).toEqual([{ n: 1 }]);
      expect(await asUser(ana, 'select read_at is not null as read from activity')).toEqual([{ read: true }]);
      expect(await asUser(bia, 'select * from activity')).toEqual([]);
      await expectDbError(asUser(ana, 'update activity set read_at = null'), /permission denied/);
    });
  });

  describe('timeline', () => {
    it('shows followed posts, followed reviews and replies in watched conversations, newest first', async () => {
      await follow(ana, bia);
      const pb = await post(bia);
      const pc = await post(cris); // not followed
      await asUser(bia, "insert into list_items(work_id, status, review) values ($1, 'concluido', 'Ótimo filme')", [work]);
      const [{ id: review }] = await asUser<Id>(bia, 'select publish_review($1) as id', [work]);
      const pa = await post(ana);
      const r1 = await reply(cris, pa);
      await reply(ana, pa); // own reply: not shown
      const t = await topic(cris);
      await asUser(ana, 'insert into watches(topic_id) values ($1)', [t]);
      const tr = await topicReply(bia, t);
      expect(await timeline(ana)).toEqual([
        { item_type: 'reply', item_id: tr, actor_id: bia },
        { item_type: 'reply', item_id: r1, actor_id: cris },
        { item_type: 'review', item_id: review, actor_id: bia },
        { item_type: 'post', item_id: pb, actor_id: bia },
      ]);
      expect((await timeline(ana)).map((i) => i.item_id)).not.toContain(pc);
    });

    it('only shows replies written after watching started', async () => {
      const p = await post(bia);
      await reply(cris, p);
      await asUser(ana, 'insert into watches(social_post_id) values ($1)', [p]);
      const r2 = await reply(cris, p);
      expect(await timeline(ana)).toEqual([{ item_type: 'reply', item_id: r2, actor_id: cris }]);
    });

    it('pages with p_before and clamps the limit', async () => {
      await follow(ana, bia);
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) ids.push(await post(bia));
      const first = await asUser<{ item_id: string; created_at: string }>(ana, 'select item_id, created_at::text from timeline(null, 2)');
      expect(first.map((i) => i.item_id)).toEqual([ids[2], ids[1]]);
      const next = await asUser<{ item_id: string }>(ana, 'select item_id from timeline($1, 2)', [first[1].created_at]);
      expect(next.map((i) => i.item_id)).toEqual([ids[0]]);
      expect(await asUser(ana, 'select * from timeline(null, 0)')).toHaveLength(1);
      expect(await asSuperuser('select * from timeline()')).toEqual([]);
    });

    it('excludes blocked people and deleted content', async () => {
      await follow(ana, bia);
      await follow(ana, cris);
      await post(bia);
      const pc = await post(cris);
      await asUser(ana, 'insert into watches(social_post_id) values ($1)', [pc]);
      await reply(bia, pc);
      await asUser(cris, 'select delete_social_post($1)', [pc]);
      await block(bia, ana);
      expect(await timeline(ana)).toEqual([]);
    });
  });

  describe('suggested people', () => {
    it('most active members, excluding me, followed, blocked, muted, banned and nameless', async () => {
      const dani = await named('dani@example.com', 'dani');
      const edu = await named('edu@example.com', 'edu');
      const fe = await named('fe@example.com', 'fefe');
      const gil = await named('gil@example.com', 'gil');
      await post(bia);
      await post(bia);
      await post(cris);
      await topic(dani);
      await post(edu);
      await post(fe);
      await post(gil);
      await post(ana);
      await post(ana);
      await post(ana);
      await follow(ana, cris);
      await block(edu, ana);
      await mute(ana, fe);
      await asSuperuser('update profiles set banned_at = now() where id = $1', [gil]);
      const rows = await asUser<{ username: string; recent_posts: number }>(ana, 'select username, recent_posts from suggested_people(8)');
      expect(rows.slice(0, 2)).toEqual([{ username: 'bia', recent_posts: 2 }, { username: 'dani', recent_posts: 1 }]);
      const names = rows.map((r) => r.username);
      for (const excluded of ['ana', 'cris', 'edu', 'fefe', 'gil', null]) expect(names).not.toContain(excluded);
      expect(await asUser(ana, 'select * from suggested_people(1)')).toHaveLength(1);
    });
  });

  describe('public list', () => {
    beforeEach(async () => {
      await asUser(ana, "insert into list_items(work_id, status, rating, review) values ($1, 'concluido', 4.5, 'Segredo')", [work]);
    });

    it('is visible only when enabled and never exposes ratings or reviews', async () => {
      expect(await asUser(bia, "select * from public_list('ana')")).toEqual([]);
      await asUser(ana, 'update profile_details set list_public = true where id = $1', [ana]);
      const rows = await asUser<Record<string, unknown>>(bia, "select * from public_list('ana')");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ work_id: work, status: 'concluido' });
      expect(Object.keys(rows[0]).sort()).toEqual(['status', 'updated_at', 'work_id']);
    });

    it('is hidden from blocked people', async () => {
      await asUser(ana, 'update profile_details set list_public = true where id = $1', [ana]);
      await block(ana, bia);
      expect(await asUser(bia, "select * from public_list('ana')")).toEqual([]);
    });
  });
});
