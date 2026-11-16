import { describe, it, expect } from 'vitest';
import { AVATAR_MAX_BYTES, centerSquare, checkAvatar, checkAvatarSource } from '@/lib/social/avatar';

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
