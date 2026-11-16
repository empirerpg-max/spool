export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** Side of the square the browser crops the photo to before sending it. */
export const AVATAR_SIZE = 512;

/** Checks a chosen photo. Returns the message to show, or null when it is fine. */
export function checkAvatar(file: { type: string; size: number }): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'A foto precisa ser JPG, PNG ou WebP.';
  if (file.size <= 0) return 'Escolha uma foto.';
  if (file.size > AVATAR_MAX_BYTES) return 'A foto pode ter no máximo 2 MB.';
  return null;
}

/** The original picture may be large (phone photos); the browser shrinks it before sending. */
export const AVATAR_SOURCE_MAX_BYTES = 15 * 1024 * 1024;

/** Check of the picture as chosen, before the browser crops and shrinks it. */
export function checkAvatarSource(file: { type: string; size: number }): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return 'A foto precisa ser JPG, PNG ou WebP.';
  if (file.size > AVATAR_SOURCE_MAX_BYTES) return 'Essa foto é grande demais. Escolha uma de até 15 MB.';
  return null;
}

/** The largest centered square of a width × height picture. */
export function centerSquare(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}
