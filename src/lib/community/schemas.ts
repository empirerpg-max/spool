import { z } from 'zod';

const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const checkbox = z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean());
const optionalInt = (min: number, max: number) => z.preprocess(blankToUndefined, z.coerce.number().int().min(min).max(max).optional());
const text = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label}: mínimo de ${min} caractere${min > 1 ? 's' : ''}`).max(max, `${label}: máximo de ${max} caracteres`);

export const topicSchema = z
  .object({
    title: text(3, 120, 'Título'),
    body: text(1, 10000, 'Texto'),
    hasSpoiler: checkbox,
    spoilerSeason: optionalInt(1, 100),
    spoilerEpisode: optionalInt(1, 500),
  })
  .transform((t) => (t.hasSpoiler ? t : { ...t, spoilerSeason: undefined, spoilerEpisode: undefined }))
  .refine((t) => t.spoilerEpisode === undefined || t.spoilerSeason !== undefined, {
    message: 'Informe a temporada',
    path: ['spoilerSeason'],
  });

export const replySchema = z.object({ body: text(1, 10000, 'Resposta'), hasSpoiler: checkbox });

export const REPORT_REASONS = ['spoiler', 'ofensa', 'spam', 'pirataria', 'outro'] as const;

export const reportSchema = z
  .object({
    reason: z.enum(REPORT_REASONS),
    note: z.preprocess(blankToUndefined, z.string().trim().max(500).optional()),
    topicId: z.preprocess(blankToUndefined, z.uuid().optional()),
    postId: z.preprocess(blankToUndefined, z.uuid().optional()),
  })
  .refine((r) => (r.topicId === undefined) !== (r.postId === undefined), { message: 'Denúncia inválida' });

export type TopicInput = z.infer<typeof topicSchema>;
export type ReplyInput = z.infer<typeof replySchema>;
export type ReportInput = z.infer<typeof reportSchema>;
