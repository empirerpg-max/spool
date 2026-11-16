import { describe, it, expect, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, createUser, signUpRaw, randomCode, expectDbError } from './harness';

const full = (over: Record<string, string> = {}) => ({
  first_name: 'Ana', last_name: 'Souza', birth_date: '1995-05-05', terms_version: '2026-11-16', ...over,
});
const today = async () => (await asSuperuser<{ d: string }>("select to_char((now() at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD') as d"))[0].d;
const yearsAgo = (iso: string, years: number, plusDays = 0) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() + plusDays);
  return d.toISOString().slice(0, 10);
};
const newInvite = async () => { const c = randomCode(); await asSuperuser('insert into invites(code) values ($1)', [c]); return c; };

describe.skipIf(!hasDb)('invite-only sign-up', () => {
  beforeEach(resetDatabase);

  it('the very first account needs no invite and becomes admin', async () => {
    const id = await signUpRaw('dona@example.com', full());
    expect(await asSuperuser('select is_admin, first_name from profiles where id = $1', [id])).toEqual([{ is_admin: true, first_name: 'Ana' }]);
  });

  it('after the first account, signing up without an invite fails', async () => {
    await signUpRaw('dona@example.com', full());
    await expectDbError(signUpRaw('x@example.com', full()), 'invalid_invite');
    await expectDbError(signUpRaw('y@example.com', null), /invalid_invite|invalid_signup/);
  });

  it('a valid invite creates the account and is consumed', async () => {
    await signUpRaw('dona@example.com', full());
    const code = await newInvite();
    const id = await signUpRaw('bia@example.com', full({ first_name: 'Bia', invite_code: code }));
    expect(await asSuperuser('select used_by = $2 as mine, used_at is not null as used from invites where code = $1', [code, id]))
      .toEqual([{ mine: true, used: true }]);
    expect(await asSuperuser('select is_admin, first_name, last_name, birth_date::text, terms_version, terms_accepted_at is not null as accepted from profiles where id = $1', [id]))
      .toEqual([{ is_admin: false, first_name: 'Bia', last_name: 'Souza', birth_date: '1995-05-05', terms_version: '2026-11-16', accepted: true }]);
    await expectDbError(signUpRaw('cris@example.com', full({ invite_code: code })), 'invalid_invite');
  });

  it('accepts the code in lowercase with spaces', async () => {
    await signUpRaw('dona@example.com', full());
    const code = await newInvite();
    await expect(signUpRaw('bia@example.com', full({ invite_code: ` ${code.toLowerCase()} ` }))).resolves.toBeTruthy();
  });

  it('requires 16 years on the São Paulo calendar', async () => {
    await signUpRaw('dona@example.com', full());
    const t = await today();
    await expectDbError(signUpRaw('a@example.com', full({ birth_date: yearsAgo(t, 16, 1), invite_code: await newInvite() })), 'too_young');
    await expect(signUpRaw('b@example.com', full({ birth_date: yearsAgo(t, 16), invite_code: await newInvite() }))).resolves.toBeTruthy();
  });

  it('requires the current terms and all personal fields', async () => {
    await signUpRaw('dona@example.com', full());
    await expectDbError(signUpRaw('a@example.com', full({ terms_version: 'velha', invite_code: await newInvite() })), 'terms_required');
    await expectDbError(signUpRaw('b@example.com', { ...full({ invite_code: await newInvite() }), first_name: ' ' }), 'invalid_signup');
    await expectDbError(signUpRaw('c@example.com', { ...full({ invite_code: await newInvite() }), birth_date: 'ontem' }), 'invalid_signup');
  });

  it('the bootstrap account also needs personal data and terms', async () => {
    await expectDbError(signUpRaw('dona@example.com', null), 'invalid_signup');
  });

  it('a used invite cannot be taken twice at the same time', async () => {
    await signUpRaw('dona@example.com', full());
    const code = await newInvite();
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 });
    const [a, b] = await Promise.all([pool.connect(), pool.connect()]);
    try {
      await a.query('begin');
      await b.query('begin');
      await a.query("insert into auth.users(email, raw_user_meta_data) values ('p1@example.com', $1)", [JSON.stringify(full({ invite_code: code }))]);
      const second = b.query("insert into auth.users(email, raw_user_meta_data) values ('p2@example.com', $1)", [JSON.stringify(full({ invite_code: code }))]);
      await a.query('commit');
      await expect(second).rejects.toThrow('invalid_invite');
      await b.query('rollback');
    } finally {
      a.release(); b.release(); await pool.end();
    }
  });

  it('anyone can check whether a code is usable', async () => {
    await signUpRaw('dona@example.com', full());
    const code = await newInvite();
    expect(await asAnon('select invite_is_valid($1) as ok', [code.toLowerCase()])).toEqual([{ ok: true }]);
    expect(await asAnon("select invite_is_valid('ZZZZZZZZ') as ok")).toEqual([{ ok: false }]);
  });

  it('invite_is_valid is true for anything while there is no admin', async () => {
    expect(await asAnon("select invite_is_valid('') as ok")).toEqual([{ ok: true }]);
  });

  it('only admins create invites, in the expected format', async () => {
    const adm = await signUpRaw('dona@example.com', full());
    const user = await createUser('bia@example.com');
    const [{ code }] = await asUser<{ code: string }>(adm, "select create_invite('Para a Bia') as code");
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(await asUser(adm, 'select note from invites where code = $1', [code])).toEqual([{ note: 'Para a Bia' }]);
    await expectDbError(asUser(user, "select create_invite('x')"), 'forbidden');
    expect(await asUser(user, 'select * from invites')).toEqual([]);
    await expectDbError(asAnon("select create_invite('x')"), /permission denied/);
  });

  it('personal data stays private', async () => {
    const adm = await signUpRaw('dona@example.com', full());
    const bia = await createUser('bia@example.com', { first_name: 'Bia' });
    await asSuperuser("update profiles set username = 'bia' where id = $1", [bia]);
    await expectDbError(asUser(adm, 'select first_name from profiles where id = $1', [bia]), /permission denied/);
    await expectDbError(asAnon('select birth_date from profiles'), /permission denied/);
    expect(await asAnon('select username from profiles where id = $1', [bia])).toEqual([{ username: 'bia' }]);
    expect(await asUser(bia, 'select first_name, last_name, birth_date::text from my_profile()')).toEqual([{ first_name: 'Bia', last_name: 'Silva', birth_date: '1990-01-01' }]);
  });
});
