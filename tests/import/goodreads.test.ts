import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseGoodreads } from '@/lib/import/goodreads';
import { ImportFormatError, MAX_IMPORT_ROWS } from '@/lib/import/types';

const csv = readFileSync(path.resolve(__dirname, '../fixtures/goodreads-library.csv'), 'utf8');

describe('parseGoodreads', () => {
  const rows = parseGoodreads(csv);

  it('parses a read book with rating, review and date', () => {
    expect(rows[0]).toEqual({
      kind: 'book', title: 'Dom Casmurro', year: 1899, author: 'Machado de Assis', isbn: '9788508040094',
      status: 'concluido', rating: 5, review: 'Capitu!\nOlhos de ressaca.', finishedOn: '2023-05-14',
    });
  });

  it('maps shelves and treats rating 0 and empty ISBN as missing', () => {
    expect(rows[1]).toMatchObject({ status: 'andamento', rating: null, isbn: null, finishedOn: null });
    expect(rows[2]).toMatchObject({ status: 'quero', review: null });
  });

  it('rejects other CSVs', () => {
    expect(() => parseGoodreads('Name,Year\nX,2000')).toThrow(ImportFormatError);
  });

  it('rejects files that are too big', () => {
    const header = csv.split('\n')[0];
    const line = csv.split('\n')[1];
    const big = [header, ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => line)].join('\n');
    expect(() => parseGoodreads(big)).toThrow('Arquivo grande demais (máximo 5000 itens)');
  });
});
