import { describe, it, expect } from 'vitest';
import { safeNextPath } from '@/lib/auth/redirect';

describe('safeNextPath', () => {
  it('keeps internal paths', () => {
    expect(safeNextPath('/obra/filme/603')).toBe('/obra/filme/603');
    expect(safeNextPath('/busca?q=a')).toBe('/busca?q=a');
  });
  it.each([null, undefined, '', '//evil.com', 'https://evil.com', '/\\evil.com', 'evil.com', '/%2F%2Fevil.com'.replace('%2F%2F', '/')])(
    'rejects %s',
    (next) => expect(safeNextPath(next)).toBe('/'),
  );
});
