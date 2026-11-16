import { describe, it, expect } from 'vitest';
import { isCursor } from '@/lib/social/cursor';

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
