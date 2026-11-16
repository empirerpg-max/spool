import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const SRC = path.resolve(__dirname, '../../src');
const RAW = /\b(?:bg|text|border|divide|ring|from|via|to)-(?:neutral|amber|red|green|gray|zinc|slate)-\d+/g;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.tsx') ? [p] : [];
  });
}

describe('Saguão palette', () => {
  it('uses theme tokens instead of raw Tailwind colors', () => {
    const offenders = files(SRC).flatMap((f) => (readFileSync(f, 'utf8').match(RAW) ?? []).map((m) => `${path.relative(SRC, f)}: ${m}`));
    expect(offenders).toEqual([]);
  });
  it('has no light/dark variants left (the theme is dark only)', () => {
    const offenders = files(SRC).filter((f) => /\bdark:/.test(readFileSync(f, 'utf8'))).map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
