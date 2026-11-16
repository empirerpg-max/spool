const MESSAGES: Record<string, string> = {
  blocked: 'Não é possível: há um bloqueio entre vocês.',
  banned: 'Sua conta está suspensa.',
  no_username: 'Escolha um nome de usuário antes.',
  not_signed_in: 'Entre para continuar.',
};

export const SOCIAL_FALLBACK = 'Não foi possível. Tente de novo.';

/** Turns an error raised by the social rules in the database into Portuguese copy. */
export function socialErrorMessage(err: { code?: string; message?: string }): string {
  if (err.message && MESSAGES[err.message]) return MESSAGES[err.message];
  return SOCIAL_FALLBACK;
}
