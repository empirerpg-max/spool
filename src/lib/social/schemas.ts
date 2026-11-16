import { z } from 'zod';
import { REPORT_REASONS } from '@/lib/community/schemas';

import { CAPTION_MAX, REPLY_MAX } from './limits';

export { CAPTION_MAX, REPLY_MAX };

const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const checkbox = z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean());
const optionalUuid = z.preprocess(blankToUndefined, z.uuid().optional());
const text = (max: number, label: string, empty: string) =>
  z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string().trim().min(1, empty).max(max, `${label}: máximo de ${max} caracteres`));

/**
 * A new post. The work is either one already saved (workId) or a search pick (kind + externalId)
 * that the server saves first.
 */
export const postSchema = z
  .object({
    workId: optionalUuid,
    kind: z.preprocess(blankToUndefined, z.enum(['movie', 'series', 'book']).optional()),
    externalId: z.preprocess(blankToUndefined, z.string().trim().max(40).optional()),
    caption: text(CAPTION_MAX, 'Legenda', 'Escreva uma legenda'),
    hasSpoiler: checkbox,
  })
  .superRefine((p, ctx) => {
    const picked = p.kind !== undefined && p.externalId !== undefined;
    if (p.workId === undefined && !picked) {
      ctx.addIssue({ code: 'custom', path: ['work'], message: 'Escolha um filme, série ou livro' });
    } else if (picked && !(p.kind === 'book' ? /^OL\d+W$/ : /^\d+$/).test(p.externalId as string)) {
      ctx.addIssue({ code: 'custom', path: ['work'], message: 'Escolha um filme, série ou livro' });
    }
  });

export const replySchema = z.object({ body: text(REPLY_MAX, 'Resposta', 'Escreva sua resposta'), hasSpoiler: checkbox });

export const socialReportSchema = z
  .object({
    reason: z.enum(REPORT_REASONS),
    note: z.preprocess(blankToUndefined, z.string().trim().max(500).optional()),
    socialPostId: optionalUuid,
    socialReplyId: optionalUuid,
  })
  .refine((r) => (r.socialPostId === undefined) !== (r.socialReplyId === undefined), { message: 'Denúncia inválida' });

export type PostInput = z.infer<typeof postSchema>;
export type SocialReplyInput = z.infer<typeof replySchema>;
