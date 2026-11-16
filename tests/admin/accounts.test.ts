import { describe, it, expect } from 'vitest';
import { temporaryPassword } from '@/lib/admin/temporary-password';
import { makeSignUpSchema } from '@/lib/auth/signup-schema';

describe('temporaryPassword', () => {
  it('is 12 characters with letters and digits and passes the sign-up password rule', () => {
    for (let i = 0; i < 200; i++) {
      const p = temporaryPassword();
      expect(p).toHaveLength(12);
      expect(p).toMatch(/[A-Za-z]/);
      expect(p).toMatch(/\d/);
      expect(p).not.toMatch(/[0O1lI]/);
    }
  });
  it('is accepted by the account password rule', () => {
    const p = temporaryPassword();
    const r = makeSignUpSchema('2026-11-16').safeParse({
      firstName: 'A', lastName: 'B', birthDate: '1990-01-01', email: 'a@b.co', password: p, confirmPassword: p, acceptTerms: 'on',
    });
    expect(r.success).toBe(true);
  });
});
