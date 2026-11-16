import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const read = (p: string) => readFileSync(path.resolve(__dirname, '../src/app', p), 'utf8');

describe('legal texts only promise what exists', () => {
  it('do not mention suspension (only bans exist)', () => {
    expect(read('termos/page.tsx')).not.toMatch(/suspend/i);
  });
  it('always show a concrete contact', () => {
    for (const f of ['termos/page.tsx', 'privacidade/page.tsx']) {
      expect(read(f)).toContain('<ContactLine');
      expect(read(f)).not.toMatch(/contato abaixo|canais de contato|canais informados/);
    }
  });
});
