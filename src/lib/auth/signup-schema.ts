import { z } from 'zod';

export const TERMS_VERSION = '2026-11-16';
export const MIN_AGE = 16;
const PASSWORD_RULE = 'A senha precisa ter pelo menos 8 caracteres, com letras e números';

/** Whole years between a birth date and a day (both yyyy-mm-dd). */
export function ageOn(birth: string, today: string): number {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export const todaySaoPaulo = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const email = z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido'));

export function makeSignUpSchema(today: string) {
  return z
    .object({
      firstName: z.string().trim().min(1, 'Informe seu nome').max(50, 'Nome muito longo'),
      lastName: z.string().trim().min(1, 'Informe seu sobrenome').max(50, 'Sobrenome muito longo'),
      birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe sua data de nascimento')
        .refine((d) => ageOn(d, today) >= MIN_AGE, `Você precisa ter pelo menos ${MIN_AGE} anos`)
        .refine((d) => ageOn(d, today) <= 120, 'Confira a data de nascimento'),
      email,
      password: z.string().min(8, PASSWORD_RULE).regex(/[A-Za-zÀ-ÿ]/, PASSWORD_RULE).regex(/\d/, PASSWORD_RULE).max(72, 'Senha muito longa'),
      confirmPassword: z.string(),
      acceptTerms: z.literal('on', { error: 'Você precisa aceitar os Termos de Uso' }).transform(() => true),
      inviteCode: z.string().optional().transform((c) => (c ?? '').replace(/\s/g, '').toUpperCase()),
    })
    .refine((v) => v.password === v.confirmPassword, { message: 'As senhas não são iguais', path: ['confirmPassword'] });
}

export const signInSchema = z.object({ email, password: z.string().min(1, 'Informe sua senha') });
