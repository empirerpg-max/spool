import { describe, it, expect } from 'vitest';
import { activityVerb, ratingStars } from '@/lib/social/activity';

describe('activityVerb', () => {
  it.each([
    ['quero', 'movie', 'quer ver'], ['andamento', 'movie', 'está vendo'], ['concluido', 'movie', 'viu'],
    ['quero', 'series', 'quer ver'], ['andamento', 'series', 'está vendo'], ['concluido', 'series', 'viu'],
    ['quero', 'book', 'quer ler'], ['andamento', 'book', 'está lendo'], ['concluido', 'book', 'leu'],
  ] as const)('%s + %s → %s', (status, kind, verb) => {
    expect(activityVerb(status, kind)).toBe(verb);
  });
});

describe('ratingStars', () => {
  it('draws full stars and a half', () => {
    expect(ratingStars(4.5)).toBe('★★★★½');
    expect(ratingStars(5)).toBe('★★★★★');
    expect(ratingStars(0.5)).toBe('½');
    expect(ratingStars(3)).toBe('★★★');
  });
});
