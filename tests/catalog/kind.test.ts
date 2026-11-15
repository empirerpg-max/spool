import { describe, it, expect } from 'vitest';
import { kindFromSlug, slugFromKind, workPath, isValidExternalId } from '@/lib/catalog/kind';

describe('kind slugs', () => {
  it('maps slugs both ways', () => {
    expect(kindFromSlug('filme')).toBe('movie');
    expect(kindFromSlug('serie')).toBe('series');
    expect(kindFromSlug('livro')).toBe('book');
    expect(kindFromSlug('podcast')).toBeNull();
    expect(slugFromKind('series')).toBe('serie');
    expect(workPath('book', 'OL1W')).toBe('/obra/livro/OL1W');
    expect(workPath('movie', '603')).toBe('/obra/filme/603');
  });

  it('validates external ids per kind', () => {
    expect(isValidExternalId('movie', 'abc')).toBe(false);
    expect(isValidExternalId('movie', '603')).toBe(true);
    expect(isValidExternalId('series', '1399')).toBe(true);
    expect(isValidExternalId('book', 'OL45804W')).toBe(true);
    expect(isValidExternalId('book', '603')).toBe(false);
  });
});
