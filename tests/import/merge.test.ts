import { describe, it, expect } from 'vitest';
import { mergeImported } from '@/lib/import/process';
import type { ImportRow } from '@/lib/import/types';

const row = (over: Partial<ImportRow> = {}): ImportRow => ({
  kind: 'movie', title: 'A', year: 2020, author: null, isbn: null, status: 'concluido', rating: 4, review: 'Bom', finishedOn: '2024-01-01', ...over,
});

describe('mergeImported', () => {
  it('creates a new item from the row', () => {
    expect(mergeImported(null, row())).toEqual({ status: 'concluido', rating: 4, review: 'Bom', finished_on: '2024-01-01' });
  });
  it('never downgrades status nor overwrites existing rating or review', () => {
    expect(mergeImported({ status: 'concluido', rating: 5, review: 'Meu texto', finished_on: null }, row({ status: 'quero', rating: null, review: null })))
      .toEqual({ status: 'concluido', rating: 5, review: 'Meu texto', finished_on: null });
    expect(mergeImported({ status: 'concluido', rating: null, review: null, finished_on: null }, row()))
      .toEqual({ status: 'concluido', rating: 4, review: 'Bom', finished_on: '2024-01-01' });
  });
  it('upgrades status and drops rating/review when the result is not concluido', () => {
    expect(mergeImported({ status: 'quero', rating: null, review: null, finished_on: null }, row({ status: 'andamento', rating: 3, review: 'x' })))
      .toEqual({ status: 'andamento', rating: null, review: null, finished_on: null });
  });
});
