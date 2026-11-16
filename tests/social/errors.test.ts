import { describe, it, expect } from 'vitest';
import { socialErrorMessage } from '@/lib/social/errors';

describe('socialErrorMessage', () => {
  it('translates the database rules', () => {
    expect(socialErrorMessage({ code: 'P0001', message: 'blocked' })).toBe('Não é possível: há um bloqueio entre vocês.');
    expect(socialErrorMessage({ code: 'P0001', message: 'banned' })).toBe('Sua conta está suspensa.');
    expect(socialErrorMessage({ code: 'P0001', message: 'no_username' })).toBe('Escolha um nome de usuário antes.');
    expect(socialErrorMessage({ code: 'P0001', message: 'not_signed_in' })).toBe('Entre para continuar.');
  });
  it('translates the posting rules', () => {
    expect(socialErrorMessage({ code: 'P0001', message: 'blocked_link' })).toBe('Esse link não é permitido no Lobby.');
    expect(socialErrorMessage({ code: 'P0001', message: 'rate_limited' })).toBe('Você está publicando rápido demais. Espere alguns minutos.');
    expect(socialErrorMessage({ code: 'P0001', message: 'forbidden' })).toBe('Você não pode fazer isso.');
    expect(socialErrorMessage({ code: 'P0001', message: 'not_found' })).toBe('Essa publicação não existe mais.');
    expect(socialErrorMessage({ code: 'P0001', message: 'post_closed' })).toBe('Esta publicação foi removida.');
  });
  it('a repeated report is explained', () => {
    expect(socialErrorMessage({ code: '23505', message: 'duplicate key value violates unique constraint "reports_once_per_social_post"' }))
      .toBe('Você já denunciou isso.');
  });
  it('falls back to a generic message', () => {
    expect(socialErrorMessage({ code: '42501', message: 'permission denied' })).toBe('Não foi possível. Tente de novo.');
    expect(socialErrorMessage({})).toBe('Não foi possível. Tente de novo.');
  });
});
