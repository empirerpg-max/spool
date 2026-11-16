import { describe, it, expect } from 'vitest';
import { socialErrorMessage } from '@/lib/social/errors';

describe('socialErrorMessage', () => {
  it('translates the database rules', () => {
    expect(socialErrorMessage({ code: 'P0001', message: 'blocked' })).toBe('Não é possível: há um bloqueio entre vocês.');
    expect(socialErrorMessage({ code: 'P0001', message: 'banned' })).toBe('Sua conta está suspensa.');
    expect(socialErrorMessage({ code: 'P0001', message: 'no_username' })).toBe('Escolha um nome de usuário antes.');
    expect(socialErrorMessage({ code: 'P0001', message: 'not_signed_in' })).toBe('Entre para continuar.');
  });
  it('falls back to a generic message', () => {
    expect(socialErrorMessage({ code: '42501', message: 'permission denied' })).toBe('Não foi possível. Tente de novo.');
    expect(socialErrorMessage({})).toBe('Não foi possível. Tente de novo.');
  });
});
