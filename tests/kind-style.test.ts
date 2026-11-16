import { describe, it, expect } from 'vitest';
import { KIND_LABEL, kindTextClass, kindBgClass, kindBorderClass } from '@/lib/kind-style';

describe('kind style', () => {
  it('names each kind in Portuguese', () => {
    expect(KIND_LABEL).toEqual({ movie: 'Filme', series: 'Série', book: 'Livro' });
  });
  it('maps kinds to their color utilities', () => {
    expect(kindTextClass('book')).toBe('text-livro');
    expect(kindBgClass('movie')).toBe('bg-film');
    expect(kindBorderClass('series')).toBe('border-serie');
  });
});
