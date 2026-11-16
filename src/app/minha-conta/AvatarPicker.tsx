'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Avatar } from '@/components/social/Avatar';
import { AVATAR_SIZE, centerSquare, checkAvatar, checkAvatarSource } from '@/lib/social/avatar';
import { removeAvatar, uploadAvatar } from '@/lib/social/profile-actions';

/** Crops the picture to a centered square, shrinks it to 512×512 and exports WebP (PNG where the browser can't). */
async function cropToSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { sx, sy, side } = centerSquare(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/webp', 0.85));
}

export function AvatarPicker({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(avatarUrl);
  const [draft, setDraft] = useState<{ blob: Blob; preview: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => { if (draft) URL.revokeObjectURL(draft.preview); }, [draft]);

  async function choose(file: File | undefined) {
    setError(null);
    setMessage(null);
    if (!file) return;
    const problem = checkAvatarSource(file);
    if (problem) return setError(problem);
    try {
      const blob = await cropToSquare(file);
      const after = checkAvatar(blob);
      if (after) return setError(after);
      setDraft({ blob, preview: URL.createObjectURL(blob) });
    } catch {
      setError('Não conseguimos abrir essa foto. Tente outra.');
    }
  }

  function save() {
    if (!draft) return;
    const form = new FormData();
    form.set('avatar', new File([draft.blob], 'avatar.webp', { type: draft.blob.type }));
    startTransition(async () => {
      const r = await uploadAvatar(form);
      if (r.error) return setError(r.error);
      setCurrent(r.avatarUrl ?? null);
      setDraft(null);
      setMessage('Foto salva!');
    });
  }

  function remove() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const r = await removeAvatar();
      if (r.error) return setError(r.error);
      setCurrent(null);
      setMessage('Foto removida.');
    });
  }

  const reset = () => { setDraft(null); if (input.current) input.current.value = ''; };
  const button = 'rounded-full border border-line-strong px-4 py-1.5 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60';

  return (
    <div className="flex flex-wrap items-center gap-4">
      {draft ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.preview} alt="Prévia da nova foto" className="size-24 rounded-full border border-line object-cover" />
      ) : (
        <Avatar url={current} name={name} size="lg" />
      )}
      <div className="space-y-2">
        <input ref={input} id="avatar-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
          onChange={(e) => { void choose(e.target.files?.[0]); }} />
        {draft ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={pending} className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg disabled:opacity-60">Salvar foto</button>
            <button type="button" onClick={reset} disabled={pending} className={button}>Cancelar</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={pending} className={button}>
              {current ? 'Trocar foto' : 'Escolher foto'}
            </button>
            {current && <button type="button" onClick={remove} disabled={pending} className={`${button} text-muted`}>Remover foto</button>}
          </div>
        )}
        <p className="text-xs text-muted">JPG, PNG ou WebP. A foto é recortada em quadrado, pelo centro.</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {message && <p role="status" className="text-sm text-success">{message}</p>}
      </div>
    </div>
  );
}
