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

export type AvatarType = (typeof AVATAR_TYPES)[number];

const startsWith = (b: Uint8Array, sig: number[], at = 0) => b.length >= at + sig.length && sig.every((v, i) => b[at + i] === v);
const ascii = (t: string) => [...t].map((c) => c.charCodeAt(0));

/**
 * What the file really is, from its first bytes (the name and the type the browser declares can lie).
 * Only JPEG, PNG and WebP are recognised; anything else is null.
 */
export function sniffImageType(b: Uint8Array): AvatarType | null {
  if (startsWith(b, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8)) return 'image/webp';
  return null;
}

export const AVATAR_EXTENSION: Record<AvatarType, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * The stored file behind a photo address, only when it belongs to this person
 * ("{userId}/{random}.webp", or the older "{userId}.webp"). Null for anything else.
 */
export function avatarObjectPath(url: string | null, userId: string): string | null {
  if (!url) return null;
  const marker = '/storage/v1/object/public/avatars/';
  const at = url.indexOf(marker);
  if (at < 0) return null;
  const p = url.slice(at + marker.length).split(/[?#]/)[0];
  if (p.includes('..')) return null;
  return p === `${userId}.webp` || (p.startsWith(`${userId}/`) && /^[\w-]+\.(webp|jpg|png)$/.test(p.slice(userId.length + 1))) ? p : null;
}
