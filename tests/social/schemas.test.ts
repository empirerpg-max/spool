import { describe, it, expect } from 'vitest';
import { postSchema, replySchema, socialReportSchema, CAPTION_MAX, REPLY_MAX } from '@/lib/social/schemas';

const WORK = '6f1c1a3e-0e6b-4d5b-9b52-1c2d3e4f5a6b';

describe('postSchema', () => {
  it('trims the caption and reads the spoiler checkbox', () => {
    expect(postSchema.parse({ workId: WORK, caption: '  Que final!  ', hasSpoiler: 'on' }))
      .toMatchObject({ workId: WORK, caption: 'Que final!', hasSpoiler: true });
  });
  it('accepts a search pick (kind + external id) instead of a saved work', () => {
    expect(postSchema.parse({ kind: 'movie', externalId: '603', caption: 'Oi' }))
      .toMatchObject({ kind: 'movie', externalId: '603', hasSpoiler: false });
  });
  it('requires a work', () => {
    const r = postSchema.safeParse({ caption: 'Oi', workId: '' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => [i.path[0], i.message])).toEqual([['work', 'Escolha um filme, série ou livro']]);
  });
  it('refuses a malformed pick', () => {
    expect(postSchema.safeParse({ kind: 'movie', externalId: 'OL1W', caption: 'Oi' }).success).toBe(false);
    expect(postSchema.safeParse({ kind: 'podcast', externalId: '1', caption: 'Oi' }).success).toBe(false);
  });
  it('caption has 1 to 1000 characters', () => {
    expect(CAPTION_MAX).toBe(1000);
    expect(postSchema.safeParse({ workId: WORK, caption: 'a'.repeat(1000) }).success).toBe(true);
    const long = postSchema.safeParse({ workId: WORK, caption: 'a'.repeat(1001) });
    expect(long.error?.issues[0].message).toBe('Legenda: máximo de 1000 caracteres');
    const blank = postSchema.safeParse({ workId: WORK, caption: '   ' });
    expect(blank.error?.issues[0]).toMatchObject({ path: ['caption'], message: 'Escreva uma legenda' });
  });
});

describe('replySchema', () => {
  it('body has 1 to 2000 characters', () => {
    expect(REPLY_MAX).toBe(2000);
    expect(replySchema.parse({ body: ' Concordo ', hasSpoiler: undefined })).toEqual({ body: 'Concordo', hasSpoiler: false });
    expect(replySchema.safeParse({ body: 'a'.repeat(2001) }).error?.issues[0].message).toBe('Resposta: máximo de 2000 caracteres');
    expect(replySchema.safeParse({ body: '' }).error?.issues[0].message).toBe('Escreva sua resposta');
  });
});

describe('socialReportSchema', () => {
  it('targets exactly one post or reply', () => {
    expect(socialReportSchema.parse({ reason: 'spam', socialPostId: WORK })).toMatchObject({ reason: 'spam', socialPostId: WORK });
    expect(socialReportSchema.safeParse({ reason: 'spam' }).success).toBe(false);
    expect(socialReportSchema.safeParse({ reason: 'spam', socialPostId: WORK, socialReplyId: WORK }).success).toBe(false);
    expect(socialReportSchema.safeParse({ reason: 'nada', socialReplyId: WORK }).success).toBe(false);
  });
});
