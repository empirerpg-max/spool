import { z } from 'zod';

const MESSAGE = 'Use de 3 a 20 letras minúsculas, números ou _';

export const usernameSchema = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .pipe(z.string().regex(/^[a-z0-9_]{3,20}$/, MESSAGE));
