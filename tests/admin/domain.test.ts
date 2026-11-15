import { describe, it, expect } from 'vitest';
import { normalizeDomain } from '@/lib/admin/domain';

describe('normalizeDomain', () => {
  it.each([
    [' HTTPS://www.Pirata.example/filmes?x=1 ', 'pirata.example'],
    ['pirata.example:8080', 'pirata.example'],
    ['sub.pirata.example', 'sub.pirata.example'],
    ['http://pirata.example', 'pirata.example'],
  ])('%s → %s', (input, expected) => expect(normalizeDomain(input)).toBe(expected));

  it.each(['not a domain', '', 'localhost', 'https://'])('rejects %s', (input) => expect(normalizeDomain(input)).toBeNull());
});
