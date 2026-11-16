'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { updateProfile, type ProfileState } from '@/lib/social/profile-actions';
import { BIO_MAX, DISPLAY_NAME_MAX } from '@/lib/social/profile-schema';

const field = 'w-full rounded-lg border border-line-strong bg-surface px-3 py-2';

type Props = { username: string | null; displayName: string | null; bio: string | null; listPublic: boolean };

export function ProfileForm({ username, displayName, bio, listPublic }: Props) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateProfile, {});
  const [bioLength, setBioLength] = useState((bio ?? '').length);
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Nome no perfil</span>
          <input name="displayName" defaultValue={displayName ?? ''} maxLength={DISPLAY_NAME_MAX} aria-describedby="display-name-help" className={field} />
        </label>
        <p id="display-name-help" className="text-xs text-muted">Opcional. Aparece no seu perfil junto do seu @. Seu nome do cadastro continua privado.</p>
      </div>
      {err.displayName && <p role="alert" className="text-sm text-danger">{err.displayName}</p>}
      <div className="space-y-1">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Biografia</span>
          <textarea name="bio" rows={3} defaultValue={bio ?? ''} maxLength={BIO_MAX} aria-describedby="bio-count"
            onChange={(e) => setBioLength(e.target.value.length)} className={field} />
        </label>
        <p id="bio-count" className="text-right text-xs text-muted">{bioLength}/{BIO_MAX}</p>
      </div>
      {err.bio && <p role="alert" className="text-sm text-danger">{err.bio}</p>}
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="listPublic" defaultChecked={listPublic} aria-describedby="list-public-help" />
          <span>Mostrar minha lista no meu perfil</span>
        </label>
        <p id="list-public-help" className="ml-6 text-xs text-muted">Aparecem só as obras e se você quer ver, está vendo ou já viu. Suas estrelas e resenhas guardadas nunca aparecem.</p>
      </div>
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="text-success">Perfil salvo!</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="rounded-full bg-fg px-5 py-2 font-semibold text-bg disabled:opacity-60">Salvar perfil</button>
        {username && <Link href={`/@${username}`} className="text-sm underline">Ver meu perfil</Link>}
      </div>
    </form>
  );
}
