import { describe, it, expect } from 'vitest';
import { reviewSchema } from '@/lib/list/schemas';

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

describe('reviewSchema', () => {
  it('parses a full form', () => {
    expect(reviewSchema.parse({ rating: '4.5', review: '  Ótimo  ', reviewHasSpoiler: 'on', finishedOn: '2026-01-10', publish: 'on' }))
      .toEqual({ rating: 4.5, review: 'Ótimo', reviewHasSpoiler: true, finishedOn: '2026-01-10', publish: true });
  });
  it('treats blanks as empty', () => {
    expect(reviewSchema.parse({ rating: '', review: '   ', finishedOn: '' }))
      .toEqual({ rating: undefined, review: null, reviewHasSpoiler: false, finishedOn: undefined, publish: false });
  });
  it.each(['4.3', '0', '6', 'abc'])('rejects rating %s', (rating) => {
    const r = reviewSchema.safeParse({ rating });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('Nota inválida');
  });
  it('rejects a future finish date', () => {
    expect(reviewSchema.safeParse({ finishedOn: tomorrow() }).success).toBe(false);
  });
  it('rejects a review over 10000 characters', () => {
    expect(reviewSchema.safeParse({ review: 'a'.repeat(10001) }).success).toBe(false);
  });
});
