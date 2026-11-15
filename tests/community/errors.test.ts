import { describe, it, expect } from 'vitest';
import { dbErrorMessage } from '@/lib/community/errors';

describe('dbErrorMessage', () => {
  it.each([
    ['blocked_link', 'Esse link não é permitido no Lobby.'],
    ['banned', 'Sua conta está suspensa.'],
    ['rate_limited', 'Você está postando rápido demais. Espere alguns minutos.'],
    ['no_username', 'Escolha um nome de usuário antes de postar.'],
    ['not_signed_in', 'Entre para participar.'],
    ['topic_closed', 'Este tópico foi removido.'],
  ])('maps %s', (message, expected) => {
    expect(dbErrorMessage({ code: 'P0001', message })).toBe(expected);
  });
  it('maps duplicate reports', () => {
    expect(dbErrorMessage({ code: '23505', message: 'duplicate key value violates unique constraint "reports_once_per_topic"' })).toBe('Você já denunciou isso.');
  });
  it('falls back to a generic message', () => {
    expect(dbErrorMessage({ code: '42501', message: 'permission denied' })).toBe('Não foi possível salvar. Tente de novo.');
    expect(dbErrorMessage({})).toBe('Não foi possível salvar. Tente de novo.');
  });
});
