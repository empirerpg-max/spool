import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseLetterboxd } from '@/lib/import/letterboxd';
import { ImportFormatError } from '@/lib/import/types';

const fx = (name: string) => ({ name, text: readFileSync(path.resolve(__dirname, '../fixtures', `letterboxd-${name}`), 'utf8') });

describe('parseLetterboxd', () => {
  const rows = parseLetterboxd([fx('watchlist.csv'), fx('watched.csv'), fx('ratings.csv'), fx('reviews.csv')]);
  const byTitle = (t: string) => rows.find((r) => r.title === t)!;

  it('merges files into one row per film', () => {
    expect(rows).toHaveLength(3);
    expect(byTitle('The Matrix')).toEqual({
      kind: 'movie', title: 'The Matrix', year: 1999, author: null, isbn: null, status: 'concluido', rating: 4, review: null, finishedOn: null,
    });
  });

  it('keeps the review with its watched date (merging by name and year when URIs differ)', () => {
    expect(byTitle('Parasite')).toMatchObject({ status: 'concluido', rating: 4.5, review: 'Genial, do começo ao fim.\nSegunda linha.', finishedOn: '2024-02-11' });
  });

  it('keeps watchlist-only films as quero', () => {
    expect(byTitle('Dune: Part Two')).toMatchObject({ status: 'quero', year: 2024, rating: null });
  });

  it('ignores unknown files', () => {
    expect(parseLetterboxd([fx('watchlist.csv'), { name: 'profile.csv', text: 'Username,Bio\nana,oi' }])).toHaveLength(2);
  });

  it('accepts paths inside the zip folder', () => {
    expect(parseLetterboxd([{ ...fx('watchlist.csv'), name: 'letterboxd-ana/watchlist.csv' }])).toHaveLength(2);
  });

  it('rejects files without Letterboxd headers', () => {
    expect(() => parseLetterboxd([{ name: 'watched.csv', text: 'a,b\n1,2' }])).toThrow(ImportFormatError);
    expect(() => parseLetterboxd([{ name: 'profile.csv', text: 'x' }])).toThrow('Arquivo não reconhecido');
  });
});
