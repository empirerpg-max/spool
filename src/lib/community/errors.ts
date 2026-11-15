const MESSAGES: Record<string, string> = {
  blocked_link: 'Esse link não é permitido no Lobby.',
  banned: 'Sua conta está suspensa.',
  rate_limited: 'Você está postando rápido demais. Espere alguns minutos.',
  no_username: 'Escolha um nome de usuário antes de postar.',
  not_signed_in: 'Entre para participar.',
  topic_closed: 'Este tópico foi removido.',
  no_review: 'Escreva a resenha antes de publicar.',
  review_removed: 'Sua resenha foi removida pela moderação e não pode ser publicada de novo.',
};

const FALLBACK = 'Não foi possível salvar. Tente de novo.';

/** Turns a Postgres/PostgREST error from the community rules into Portuguese copy. */
export function dbErrorMessage(err: { code?: string; message?: string }): string {
  if (err.code === 'P0001' && err.message && MESSAGES[err.message]) return MESSAGES[err.message];
  if (err.code === '23505') return 'Você já denunciou isso.';
  return FALLBACK;
}
