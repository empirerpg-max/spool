import { describe, it, expect } from 'vitest';
import { cursorHref, isCursor, parseCursor } from '@/lib/social/cursor';

describe('isCursor', () => {
  it('accepts timestamps as the database prints them', () => {
    expect(isCursor('2026-11-16T17:00:00.123456+00:00')).toBe(true);
    expect(isCursor('2026-11-16T17:00:00Z')).toBe(true);
  });
  it('refuses anything else', () => {
    expect(isCursor(undefined)).toBe(false);
    expect(isCursor('ontem')).toBe(false);
    expect(isCursor("2026-11-16'; drop table x")).toBe(false);
    expect(isCursor('2026-13-45T99:99:99Z')).toBe(false);
  });
});

describe('timeline cursor', () => {
  const at = '2026-11-16T17:00:00.123456+00:00';
  const id = '11111111-2222-3333-4444-555555555555';
  it('reads date and id from the address', () => {
    expect(parseCursor({ antes: at, id })).toEqual({ at, id });
    expect(parseCursor({ antes: at })).toEqual({ at, id: null });
    expect(parseCursor({ antes: at, id: 'nope' })).toEqual({ at, id: null });
    expect(parseCursor({ antes: 'ontem', id })).toBeNull();
    expect(parseCursor({})).toBeNull();
  });
  it('writes both into the "Carregar mais" address', () => {
    expect(cursorHref({ at, id })).toBe(`/timeline?antes=${encodeURIComponent(at)}&id=${id}`);
    expect(cursorHref({ at, id: null })).toBe(`/timeline?antes=${encodeURIComponent(at)}`);
  });
});
