import { z } from 'zod';
import { LIST_STATUSES } from './types';

const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const checkbox = z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean());
const todaySaoPaulo = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export const statusSchema = z.enum(LIST_STATUSES);

export const reviewSchema = z.object({
  rating: z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: 'Nota inválida' }).refine((n) => n >= 0.5 && n <= 5 && Number.isInteger(n * 2), 'Nota inválida').optional(),
  ),
  review: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null),
    z.string().max(10000, 'Resenha: máximo de 10000 caracteres').nullable(),
  ),
  reviewHasSpoiler: checkbox,
  finishedOn: z.preprocess(
    blankToUndefined,
    z.iso.date().refine((d) => d <= todaySaoPaulo(), 'A data não pode estar no futuro').optional(),
  ),
  publish: checkbox,
});

export type ReviewInput = z.infer<typeof reviewSchema>;
