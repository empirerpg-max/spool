import { describe, it, expect } from 'vitest';
import { ageOn, makeSignUpSchema, signInSchema } from '@/lib/auth/signup-schema';

const TODAY = '2026-11-16';
const schema = makeSignUpSchema(TODAY);
const valid = {
  firstName: ' Ana ', lastName: 'Souza', birthDate: '1995-05-05', email: 'ANA@Example.com ', password: 'senha123',
  confirmPassword: 'senha123', acceptTerms: 'on', inviteCode: ' ab3d efg7 ',
};
const msg = (input: object) => {
  const r = schema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('ageOn', () => {
  it('counts birthdays on the given day', () => {
    expect(ageOn('2010-11-17', TODAY)).toBe(15);
    expect(ageOn('2010-11-16', TODAY)).toBe(16);
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
  });
});

describe('sign-up form', () => {
  it('accepts and normalizes a valid form', () => {
    expect(schema.parse(valid)).toEqual({
      firstName: 'Ana', lastName: 'Souza', birthDate: '1995-05-05', email: 'ana@example.com',
      password: 'senha123', confirmPassword: 'senha123', acceptTerms: true, inviteCode: 'AB3DEFG7',
    });
  });
  it('requires 16 years', () => {
    expect(msg({ ...valid, birthDate: '2010-11-17' })).toContain('Você precisa ter pelo menos 16 anos');
    expect(msg({ ...valid, birthDate: '2010-11-16' })).toEqual([]);
    expect(msg({ ...valid, birthDate: '' })).toContain('Informe sua data de nascimento');
  });
  it('requires a password with letters and numbers', () => {
    const rule = 'A senha precisa ter pelo menos 8 caracteres, com letras e números';
    expect(msg({ ...valid, password: 'abcdefgh', confirmPassword: 'abcdefgh' })).toContain(rule);
    expect(msg({ ...valid, password: '1234567', confirmPassword: '1234567' })).toContain(rule);
  });
  it('requires matching passwords and accepted terms', () => {
    expect(msg({ ...valid, confirmPassword: 'outra123' })).toContain('As senhas não são iguais');
    expect(msg({ ...valid, acceptTerms: undefined })).toContain('Você precisa aceitar os Termos de Uso');
  });
  it('requires name, surname and a valid e-mail', () => {
    expect(msg({ ...valid, firstName: ' ' })).toContain('Informe seu nome');
    expect(msg({ ...valid, lastName: '' })).toContain('Informe seu sobrenome');
    expect(msg({ ...valid, email: 'ana' })).toContain('Informe um e-mail válido');
  });
});

describe('sign-in form', () => {
  it('normalizes the e-mail and requires a password', () => {
    expect(signInSchema.parse({ email: ' Ana@X.com ', password: 'x' })).toEqual({ email: 'ana@x.com', password: 'x' });
    expect(signInSchema.safeParse({ email: 'ana@x.com', password: '' }).success).toBe(false);
  });
});
