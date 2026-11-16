import { describe, it, expect } from 'vitest';
import { profileSchema } from '@/lib/social/profile-schema';

describe('profileSchema', () => {
  it('trims name and bio and reads the checkbox', () => {
    expect(profileSchema.parse({ displayName: '  Ana Lê  ', bio: '  Gosto de terror. ', listPublic: 'on' }))
      .toEqual({ displayName: 'Ana Lê', bio: 'Gosto de terror.', listPublic: true });
  });
  it('turns empty fields into null and a missing checkbox into false', () => {
    expect(profileSchema.parse({ displayName: '   ', bio: '' })).toEqual({ displayName: null, bio: null, listPublic: false });
    expect(profileSchema.parse({})).toEqual({ displayName: null, bio: null, listPublic: false });
  });
  it('limits the name to 50 and the bio to 160 characters', () => {
    expect(profileSchema.safeParse({ displayName: 'a'.repeat(50), bio: 'b'.repeat(160) }).success).toBe(true);
    const r = profileSchema.safeParse({ displayName: 'a'.repeat(51), bio: 'b'.repeat(161) });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(['displayName', 'bio']);
    expect(r.error?.issues.map((i) => i.message)).toEqual(['Nome no perfil: máximo de 50 caracteres', 'Biografia: máximo de 160 caracteres']);
  });
});
