import { describe, it, expect } from 'vitest';
import { topicSchema, replySchema, reportSchema } from '@/lib/community/schemas';

const UUID = '6f1c1a3e-0e6b-4d5b-9b52-1c2d3e4f5a6b';

describe('topicSchema', () => {
  it('parses checkbox and numbers from form strings', () => {
    const r = topicSchema.parse({ title: '  Sobre o final  ', body: 'Que final!', hasSpoiler: 'on', spoilerSeason: '2', spoilerEpisode: '' });
    expect(r).toEqual({ title: 'Sobre o final', body: 'Que final!', hasSpoiler: true, spoilerSeason: 2, spoilerEpisode: undefined });
  });
  it('treats missing checkbox as no spoiler', () => {
    expect(topicSchema.parse({ title: 'Título', body: 'x' }).hasSpoiler).toBe(false);
  });
  it('rejects short title and long body', () => {
    expect(topicSchema.safeParse({ title: 'oi', body: 'x' }).success).toBe(false);
    expect(topicSchema.safeParse({ title: 'Título', body: 'a'.repeat(10001) }).success).toBe(false);
  });
  it('requires season when episode is given', () => {
    const r = topicSchema.safeParse({ title: 'Título', body: 'x', hasSpoiler: 'on', spoilerEpisode: '3' });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toContain('Informe a temporada');
  });
  it('drops season and episode when not a spoiler', () => {
    const r = topicSchema.parse({ title: 'Título', body: 'x', spoilerSeason: '2', spoilerEpisode: '3' });
    expect(r).toMatchObject({ hasSpoiler: false, spoilerSeason: undefined, spoilerEpisode: undefined });
  });
});

describe('replySchema', () => {
  it('trims body and parses spoiler flag', () => {
    expect(replySchema.parse({ body: '  Concordo  ', hasSpoiler: 'on' })).toEqual({ body: 'Concordo', hasSpoiler: true });
    expect(replySchema.safeParse({ body: '   ' }).success).toBe(false);
  });
});

describe('reportSchema', () => {
  it('accepts exactly one target', () => {
    expect(reportSchema.safeParse({ reason: 'outro', note: 'achei ruim', topicId: UUID }).success).toBe(true);
    expect(reportSchema.safeParse({ reason: 'spam', topicId: UUID, postId: UUID }).success).toBe(false);
    expect(reportSchema.safeParse({ reason: 'spam' }).success).toBe(false);
  });
  it('rejects unknown reasons and long notes', () => {
    expect(reportSchema.safeParse({ reason: 'chato', topicId: UUID }).success).toBe(false);
    expect(reportSchema.safeParse({ reason: 'outro', note: 'a'.repeat(501), topicId: UUID }).success).toBe(false);
  });
});
