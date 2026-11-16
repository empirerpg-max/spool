import { describe, it, expect } from 'vitest';
import { AVATAR_MAX_BYTES, avatarObjectPath, centerSquare, checkAvatar, checkAvatarSource, sniffImageType } from '@/lib/social/avatar';

describe('checkAvatar', () => {
  it('accepts JPG, PNG and WebP up to 2 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(checkAvatar({ type, size: 1000 })).toBeNull();
    expect(checkAvatar({ type: 'image/webp', size: 2 * 1024 * 1024 })).toBeNull();
    expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024);
  });
  it('refuses other kinds of files', () => {
    expect(checkAvatar({ type: 'image/gif', size: 1000 })).toBe('A foto precisa ser JPG, PNG ou WebP.');
    expect(checkAvatar({ type: 'application/pdf', size: 1000 })).toBe('A foto precisa ser JPG, PNG ou WebP.');
    expect(checkAvatar({ type: '', size: 1000 })).toBe('A foto precisa ser JPG, PNG ou WebP.');
  });
  it('refuses files over 2 MB or empty', () => {
    expect(checkAvatar({ type: 'image/png', size: 20 * 1024 * 1024 })).toBe('A foto pode ter no máximo 2 MB.');
    expect(checkAvatar({ type: 'image/png', size: 0 })).toBe('Escolha uma foto.');
  });
});

describe('checkAvatarSource', () => {
  it('checks the type and a generous size before cropping', () => {
    expect(checkAvatarSource({ type: 'image/jpeg', size: 8 * 1024 * 1024 })).toBeNull();
    expect(checkAvatarSource({ type: 'image/heic', size: 1000 })).toBe('A foto precisa ser JPG, PNG ou WebP.');
    expect(checkAvatarSource({ type: 'image/png', size: 20 * 1024 * 1024 })).toBe('Essa foto é grande demais. Escolha uma de até 15 MB.');
  });
});

describe('centerSquare', () => {
  it('crops the middle of wide and tall pictures', () => {
    expect(centerSquare(1200, 800)).toEqual({ sx: 200, sy: 0, side: 800 });
    expect(centerSquare(600, 1000)).toEqual({ sx: 0, sy: 200, side: 600 });
    expect(centerSquare(512, 512)).toEqual({ sx: 0, sy: 0, side: 512 });
  });
});

describe('sniffImageType', () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
  const ascii = (t: string) => [...t].map((c) => c.charCodeAt(0));
  it('recognises JPEG, PNG and WebP by their first bytes', () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(sniffImageType(bytes(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WEBP')))).toBe('image/webp');
  });
  it('refuses anything else, whatever the name or declared type', () => {
    expect(sniffImageType(bytes(...ascii('GIF89a')))).toBeNull();
    expect(sniffImageType(bytes(...ascii('<svg xmlns')))).toBeNull();
    expect(sniffImageType(bytes(...ascii('RIFF'), 1, 2, 3, 4, ...ascii('WAVE')))).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe('avatarObjectPath', () => {
  const user = '11111111-2222-3333-4444-555555555555';
  const base = 'https://x.supabase.co/storage/v1/object/public/avatars/';
  it('finds the stored file of this person from the photo address', () => {
    expect(avatarObjectPath(`${base}${user}/abc.webp`, user)).toBe(`${user}/abc.webp`);
    expect(avatarObjectPath(`${base}${user}.webp?v=123`, user)).toBe(`${user}.webp`);
  });
  it('never points at someone else’s file or a strange address', () => {
    expect(avatarObjectPath(null, user)).toBeNull();
    expect(avatarObjectPath(`${base}99999999-2222-3333-4444-555555555555/abc.webp`, user)).toBeNull();
    expect(avatarObjectPath(`${base}${user}/../other/abc.webp`, user)).toBeNull();
    expect(avatarObjectPath('https://example.com/a.webp', user)).toBeNull();
  });
});
