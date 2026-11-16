const MESSAGES: Record<string, string> = {
  blocked: 'Não é possível: há um bloqueio entre vocês.',
  banned: 'Sua conta está suspensa.',
  no_username: 'Escolha um nome de usuário antes.',
  not_signed_in: 'Entre para continuar.',
  blocked_link: 'Esse link não é permitido no Lobby.',
  rate_limited: 'Você está publicando rápido demais. Espere alguns minutos.',
  forbidden: 'Você não pode fazer isso.',
  not_found: 'Essa publicação não existe mais.',
  post_closed: 'Esta publicação foi removida.',
};

export const SOCIAL_FALLBACK = 'Não foi possível. Tente de novo.';

/** Turns an error raised by the social rules in the database into Portuguese copy. */
export function socialErrorMessage(err: { code?: string; message?: string }): string {
  if (err.message && MESSAGES[err.message]) return MESSAGES[err.message];
  if (err.code === '23505' && err.message?.includes('reports_once')) return 'Você já denunciou isso.';
  return SOCIAL_FALLBACK;
}
