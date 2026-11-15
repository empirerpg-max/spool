import { describe, it, expect } from 'vitest';
import { statusLabel, LIST_STATUSES } from '@/lib/list/types';

describe('statusLabel', () => {
  it('uses watch words for movies and series', () => {
    expect(statusLabel('movie', 'quero')).toBe('Quero ver');
    expect(statusLabel('movie', 'andamento')).toBe('Vendo');
    expect(statusLabel('series', 'concluido')).toBe('Visto');
  });
  it('uses reading words for books', () => {
    expect(statusLabel('book', 'quero')).toBe('Quero ler');
    expect(statusLabel('book', 'andamento')).toBe('Lendo');
    expect(statusLabel('book', 'concluido')).toBe('Lido');
  });
  it('lists the three states in order', () => {
    expect(LIST_STATUSES).toEqual(['quero', 'andamento', 'concluido']);
  });
});
