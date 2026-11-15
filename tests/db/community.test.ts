import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, createUser, expectDbError } from './harness';

type Id = { id: string };

describe.skipIf(!hasDb)('community', () => {
  let work: string;
  let ana: string;
  let bia: string;
  let nameless: string;
  let adm: string;

  const named = async (email: string, username: string) => {
    const id = await createUser(email);
    await asSuperuser('update profiles set username = $2 where id = $1', [id, username]);
    return id;
  };
  const topic = async (who: string, body = 'Que filme!', title = 'Sobre o final') =>
    (await asUser<Id>(who, 'insert into topics(work_id, title, body) values ($1, $2, $3) returning id', [work, title, body]))[0].id;
  const reply = async (who: string, topicId: string, body = 'Concordo') =>
    (await asUser<Id>(who, 'insert into posts(topic_id, body) values ($1, $2) returning id', [topicId, body]))[0].id;
  // Reporters can't read reports (admin-only), so no RETURNING: look the id up as superuser.
  const report = async (who: string, target: { topicId?: string; postId?: string }, reason = 'spoiler') => {
    await asUser(who, 'insert into reports(topic_id, post_id, reason) values ($1, $2, $3)', [target.topicId ?? null, target.postId ?? null, reason]);
    const [row] = await asSuperuser<Id>(
      'select id from reports where reporter_id = $1 and topic_id is not distinct from $2 and post_id is not distinct from $3',
      [who, target.topicId ?? null, target.postId ?? null],
    );
    return row.id;
  };

  beforeEach(async () => {
    await resetDatabase();
    [{ id: work }] = await asSuperuser<Id>("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix') returning id");
    ana = await named('ana@example.com', 'ana');
    bia = await named('bia@example.com', 'bia');
    nameless = await createUser('x@example.com');
    adm = await named('adm@example.com', 'adm');
    await asSuperuser('update profiles set is_admin = true where id = $1', [adm]);
  });

  it('user with username creates topic', async () => {
    const id = await topic(ana);
    expect(await asAnon('select author_id from topics where id = $1', [id])).toEqual([{ author_id: ana }]);
  });

  it('anonymous cannot create topic', async () => {
    await expectDbError(asAnon('insert into topics(work_id, title, body) values ($1, $2, $3)', [work, 'Título', 'x']), /row-level security|not_signed_in|permission denied/);
  });

  it('user without username cannot post', async () => {
    await expectDbError(topic(nameless), 'no_username');
  });

  it('author_id cannot be forged', async () => {
    await expectDbError(
      asUser(ana, 'insert into topics(work_id, author_id, title, body) values ($1, $2, $3, $4)', [work, bia, 'Título', 'x']),
      /row-level security|permission denied/,
    );
  });

  it('episode without season rejected', async () => {
    await expectDbError(
      asUser(ana, 'insert into topics(work_id, title, body, has_spoiler, spoiler_episode) values ($1, $2, $3, true, 3)', [work, 'Título', 'x']),
      /check constraint/,
    );
  });

  it('reply bumps count and activity', async () => {
    const t = await topic(ana);
    const r = await reply(bia, t);
    const [row] = await asSuperuser<{ reply_count: number; same: boolean }>(
      'select t.reply_count, t.last_activity_at = p.created_at as same from topics t, posts p where t.id = $1 and p.id = $2', [t, r]);
    expect(row).toEqual({ reply_count: 1, same: true });
  });

  it('blocked link variants', async () => {
    await asUser(adm, "select add_blocked_domain('pirata.example')");
    for (const body of ['veja WWW.Pirata.example/x', 'https://filmes.pirata.example', 'pirata.example']) {
      await expectDbError(topic(ana, body), 'blocked_link');
    }
    await expect(topic(ana, 'naopirata.example e pirata.examples.com')).resolves.toBeTruthy();
    await expectDbError(topic(ana, 'ok', 'pirata.example'), 'blocked_link');
    const t = await topic(bia);
    await expectDbError(reply(ana, t, 'link: http://pirata.example/filme'), 'blocked_link');
  });

  it('users cannot edit topics', async () => {
    const t = await topic(ana);
    await expectDbError(asUser(ana, "update topics set body = 'editado' where id = $1", [t]), /permission denied/);
    await expectDbError(asUser(ana, 'delete from topics where id = $1', [t]), /permission denied/);
    expect(await asSuperuser('select body from topics where id = $1', [t])).toEqual([{ body: 'Que filme!' }]);
  });

  it('rate limit', async () => {
    for (let i = 0; i < 5; i++) await topic(ana);
    await expectDbError(topic(ana), 'rate_limited');
  });

  it('banned user cannot post or report', async () => {
    const t = await topic(ana);
    const r = await report(bia, { topicId: t });
    await asUser(adm, "select resolve_report($1, 'banir')", [r]);
    expect(await asSuperuser('select banned_at is not null as banned from profiles where id = $1', [ana])).toEqual([{ banned: true }]);
    const other = await topic(bia);
    await expectDbError(topic(ana), 'banned');
    await expectDbError(reply(ana, other), 'banned');
    await expectDbError(report(ana, { topicId: other }), 'banned');
  });

  it('report rules', async () => {
    const t = await topic(ana);
    const p = await reply(ana, t);
    await report(bia, { topicId: t });
    await expectDbError(report(bia, { topicId: t }), /duplicate key/);
    await expectDbError(report(bia, { topicId: t, postId: p }), /check constraint/);
    expect(await asUser(bia, 'select * from reports')).toEqual([]);
    expect(await asUser(adm, 'select * from reports')).toHaveLength(1);
  });

  it('remover hides content from everyone but admins', async () => {
    const t = await topic(ana);
    const r = await report(bia, { topicId: t });
    await report(adm, { topicId: t }, 'ofensa');
    await asUser(adm, "select resolve_report($1, 'remover')", [r]);
    expect(await asAnon('select id from topics')).toEqual([]);
    expect(await asUser(ana, 'select id from topics')).toEqual([]);
    expect(await asUser(adm, 'select id from topics')).toHaveLength(1);
    const reports = await asUser<{ resolution: string; resolved_by: string }>(adm, 'select resolution, resolved_by from reports');
    expect(reports).toEqual([{ resolution: 'removido', resolved_by: adm }, { resolution: 'removido', resolved_by: adm }]);
  });

  it('ignorar keeps content', async () => {
    const t = await topic(ana);
    const r = await report(bia, { topicId: t });
    await asUser(adm, "select resolve_report($1, 'ignorar')", [r]);
    expect(await asAnon('select id from topics')).toHaveLength(1);
    expect(await asUser(adm, 'select resolution from reports')).toEqual([{ resolution: 'ignorado' }]);
  });

  it('removing a reply decrements reply_count', async () => {
    const t = await topic(ana);
    const p = await reply(bia, t);
    const r = await report(ana, { postId: p });
    await asUser(adm, "select resolve_report($1, 'remover')", [r]);
    expect(await asAnon('select reply_count from topics where id = $1', [t])).toEqual([{ reply_count: 0 }]);
    expect(await asAnon('select id from posts')).toEqual([]);
  });

  it('cannot reply to removed topic', async () => {
    const t = await topic(ana);
    const r = await report(bia, { topicId: t });
    await asUser(adm, "select resolve_report($1, 'remover')", [r]);
    await expectDbError(reply(bia, t), 'topic_closed');
  });

  it('non-admin cannot call admin RPCs', async () => {
    const t = await topic(ana);
    const r = await report(bia, { topicId: t });
    await expectDbError(asUser(ana, "select resolve_report($1, 'remover')", [r]), 'forbidden');
    await expectDbError(asUser(ana, "select add_blocked_domain('x.example')"), 'forbidden');
    await expectDbError(asUser(ana, "select remove_blocked_domain('x.example')"), 'forbidden');
    await expectDbError(asAnon("select add_blocked_domain('x.example')"), /permission denied/);
    expect(await asUser(ana, 'select * from blocked_domains')).toEqual([]);
  });

  it('invalid domain rejected', async () => {
    await expectDbError(asUser(adm, "select add_blocked_domain('not a domain')"), /check constraint/);
  });

  it('remove_blocked_domain allows the link again', async () => {
    await asUser(adm, "select add_blocked_domain('pirata.example')");
    await asUser(adm, "select remove_blocked_domain('pirata.example')");
    await expect(topic(ana, 'pirata.example')).resolves.toBeTruthy();
  });

  it('domain blocked after posting: admin can still remove and others can still reply', async () => {
    const t = await topic(ana, 'baixe em https://pirata.example/x');
    const p = await reply(bia, t, 'link de novo: pirata.example');
    await asUser(adm, "select add_blocked_domain('pirata.example')");
    await expect(reply(bia, t, 'sem link')).resolves.toBeTruthy();
    const rp = await report(ana, { postId: p });
    await asUser(adm, "select resolve_report($1, 'remover')", [rp]);
    const rt = await report(bia, { topicId: t });
    await asUser(adm, "select resolve_report($1, 'banir')", [rt]);
    expect(await asAnon('select id from topics')).toEqual([]);
  });

  it('users cannot set internal columns on insert', async () => {
    const bad = [
      ['insert into topics(work_id, title, body, created_at) values ($1, $2, $3, $4)', [work, 'Título', 'x', '2000-01-01']],
      ['insert into topics(work_id, title, body, last_activity_at) values ($1, $2, $3, $4)', [work, 'Título', 'x', '2100-01-01']],
      ['insert into topics(work_id, title, body, reply_count) values ($1, $2, $3, 999)', [work, 'Título', 'x']],
      ['insert into topics(work_id, title, body, deleted_at) values ($1, $2, $3, now())', [work, 'Título', 'x']],
    ] as const;
    for (const [sql, params] of bad) await expectDbError(asUser(ana, sql, [...params]), /permission denied/);
    const t = await topic(bia);
    await expectDbError(asUser(ana, 'insert into posts(topic_id, body, created_at) values ($1, $2, $3)', [t, 'x', '2100-01-01']), /permission denied/);
    await expectDbError(asUser(ana, "insert into reports(topic_id, reason, resolved_at) values ($1, 'spam', now())", [t]), /permission denied/);
  });

  it('replies of a removed topic are hidden too', async () => {
    const t = await topic(ana);
    await reply(bia, t);
    const r = await report(bia, { topicId: t });
    await asUser(adm, "select resolve_report($1, 'remover')", [r]);
    expect(await asAnon('select id from posts where topic_id = $1', [t])).toEqual([]);
    expect(await asUser(bia, 'select id from posts where topic_id = $1', [t])).toEqual([]);
    expect(await asUser(adm, 'select id from posts where topic_id = $1', [t])).toHaveLength(1);
  });
});
