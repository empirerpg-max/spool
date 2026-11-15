import { describe, it, expect, beforeEach } from 'vitest';
import { hasDb, resetDatabase, asAnon, asSuperuser } from './harness';

describe.skipIf(!hasDb)('catalog tables', () => {
  beforeEach(resetDatabase);

  it('anon can read works but not write', async () => {
    await asSuperuser("insert into works(kind, external_id, title) values ('movie', '603', 'Matrix')");
    expect(await asAnon<{ title: string }>('select title from works')).toEqual([{ title: 'Matrix' }]);
    await expect(asAnon("insert into works(kind, external_id, title) values ('movie', '1', 'x')")).rejects.toThrow(/row-level security/);
  });
});
