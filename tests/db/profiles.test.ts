import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser, asUser, createUser, expectDbError } from './harness';

describe.skipIf(!hasDb)('profiles', () => {
  let ana: string;
  let bia: string;

  beforeEach(async () => {
    await resetDatabase();
    ana = await createUser('ana@example.com');
    bia = await createUser('bia@example.com');
  });

  it('new auth user gets a profile without username', async () => {
    expect(await asSuperuser('select username, is_admin from profiles where id = $1', [ana])).toEqual([{ username: null, is_admin: false }]);
  });

  it('user sets own username', async () => {
    await asUser(ana, "update profiles set username = 'ana_1' where id = $1", [ana]);
    expect(await asAnon('select username from profiles where id = $1', [ana])).toEqual([{ username: 'ana_1' }]);
  });

  it('invalid usernames rejected', async () => {
    for (const bad of ['Ana', 'ab', 'a-b', 'a'.repeat(21)]) {
      await expectDbError(asUser(ana, 'update profiles set username = $2 where id = $1', [ana, bad]), /check constraint/);
    }
  });

  it('duplicate username rejected', async () => {
    await asUser(ana, "update profiles set username = 'ana_1' where id = $1", [ana]);
    await expectDbError(asUser(bia, "update profiles set username = 'ana_1' where id = $1", [bia]), /duplicate key/);
  });

  it('cannot promote self to admin', async () => {
    await expectDbError(asUser(ana, 'update profiles set is_admin = true where id = $1', [ana]), /permission denied/);
  });

  it("cannot edit someone else's profile", async () => {
    await asUser(ana, "update profiles set username = 'hacker' where id = $1", [bia]);
    expect(await asSuperuser('select username from profiles where id = $1', [bia])).toEqual([{ username: null }]);
  });

  it('is_admin() reflects the flag', async () => {
    expect(await asUser(ana, 'select is_admin() as v')).toEqual([{ v: false }]);
    expect(await asAnon('select is_admin() as v')).toEqual([{ v: false }]);
    await asSuperuser('update profiles set is_admin = true where id = $1', [ana]);
    expect(await asUser(ana, 'select is_admin() as v')).toEqual([{ v: true }]);
  });
});
