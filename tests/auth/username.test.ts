import { describe, it, expect } from 'vitest';
import { usernameSchema } from '@/lib/auth/username';

const MESSAGE = 'Use de 3 a 20 letras minúsculas, números ou _';

describe('usernameSchema', () => {
  it('trims and lowercases', () => {
    expect(usernameSchema.parse(' Ana_1 ')).toBe('ana_1');
  });
  it.each(['ab', 'a-b', 'ábc', 'a'.repeat(21), ''])('rejects %s', (bad) => {
    const r = usernameSchema.safeParse(bad);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe(MESSAGE);
  });
});
