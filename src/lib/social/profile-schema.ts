import { z } from 'zod';

const checkbox = z.preprocess((v) => v === 'on' || v === true || v === 'true', z.boolean());
/** Trimmed optional text: blank becomes null. */
const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null),
    z.string().max(max, `${label}: máximo de ${max} caracteres`).nullable(),
  );

export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 160;

export const profileSchema = z.object({
  displayName: optionalText(DISPLAY_NAME_MAX, 'Nome no perfil'),
  bio: optionalText(BIO_MAX, 'Biografia'),
  listPublic: checkbox,
  shareActivity: checkbox,
  shareRatings: checkbox,
}).transform((v) => ({ ...v, shareRatings: v.shareActivity && v.shareRatings }));

export type ProfileInput = z.infer<typeof profileSchema>;
