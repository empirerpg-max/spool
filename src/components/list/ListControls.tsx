'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { removeFromList, saveReview, setStatus, type ListActionState } from '@/lib/list/actions';
import { LIST_STATUSES, statusLabel, type ListItem } from '@/lib/list/types';
import type { WorkKind } from '@/lib/catalog/types';
import { StarRating } from './StarRating';

type Props = {
  kind: WorkKind;
  workId: string | null;
  workPath: string;
  item: ListItem | null;
  signedIn: boolean;
  hasUsername: boolean;
  /** Suspended members can't publish, so they are not invited to. */
  banned?: boolean;
};

const box = 'space-y-4';
const CLEAR_WARNING = 'Isso apaga sua nota e sua resenha desta obra. Continuar?';

function ReviewForm({ kind, workId, workPath, item }: { kind: WorkKind; workId: string; workPath: string; item: ListItem }) {
  const [state, action, pending] = useActionState<ListActionState, FormData>(saveReview.bind(null, workId, workPath), {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <StarRating name="rating" defaultValue={item.rating} />
      {err.rating && <p role="alert" className="text-sm text-danger">{err.rating}</p>}
      <label className="block space-y-1">
        <span className="text-sm font-medium">{kind === 'book' ? 'Quando terminou de ler' : 'Quando assistiu'}</span>
        <input type="date" name="finishedOn" defaultValue={item.finishedOn ?? ''} className="rounded-lg border border-line-strong bg-surface px-3 py-1.5" />
      </label>
      {err.finishedOn && <p role="alert" className="text-sm text-danger">{err.finishedOn}</p>}
      <label className="block space-y-1">
        <span className="text-sm font-medium">Resenha</span>
        <textarea name="review" rows={5} maxLength={10000} defaultValue={item.review ?? ''} className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2" />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="reviewHasSpoiler" defaultChecked={item.reviewHasSpoiler} />
        <span>Contém spoiler</span>
      </label>
      {item.removedByModeration ? (
        <p className="text-sm text-warn">Sua resenha foi removida da comunidade pela moderação. Ela continua salva só para você.</p>
      ) : (
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="publish" defaultChecked={item.published} aria-describedby="publish-help" />
            <span>Publicar na comunidade</span>
          </label>
          <p id="publish-help" className="ml-6 text-xs text-muted">Se marcado, sua resenha vira um tópico na comunidade desta obra.</p>
        </div>
      )}
      {state.error && <p role="alert" className="text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="text-success">Salvo!</p>}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="rounded-lg bg-fg px-4 py-2 font-semibold text-bg disabled:opacity-60">Salvar</button>
        {item.published && item.reviewTopicId && (
          <Link href={`${workPath}/topicos/${item.reviewTopicId}`} className="text-sm underline">Ver na comunidade</Link>
        )}
      </div>
    </form>
  );
}

/** Shown right after marking Visto/Lido; it simply goes away if ignored. */
function TellTheClub({ workId }: { workId: string }) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
      <p className="font-semibold">Contar para o clube?</p>
      <Link href={`/publicar?obra=${encodeURIComponent(workId)}`} className="rounded-full bg-fg px-4 py-1.5 text-sm font-semibold text-bg">
        Publicar sobre esta obra
      </Link>
    </div>
  );
}

export function ListControls(props: Props) {
  if (!props.workId) return <div className={box}><p className="text-muted">Lista indisponível no momento</p></div>;
  return <ListControlsFor {...props} workId={props.workId} />;
}

function ListControlsFor({ kind, workId, workPath, item, signedIn, hasUsername, banned = false }: Props & { workId: string }) {
  // Set only after the change to Visto/Lido was saved, in this visit.
  const [justFinished, setJustFinished] = useState(false);
  if (!signedIn) {
    return <div className={box}><Link href={`/entrar?next=${encodeURIComponent(workPath)}`} className="underline">Entre para salvar na sua lista</Link></div>;
  }
  if (!hasUsername) {
    return <div className={box}><Link href={`/bem-vindo?next=${encodeURIComponent(workPath)}`} className="underline">Escolha um nome de usuário para usar a lista</Link></div>;
  }

  const hasReviewData = Boolean(item && (item.rating !== null || item.review));
  return (
    <section className={box} aria-label="Minha lista">
      <div className="flex flex-wrap items-center gap-2">
        {LIST_STATUSES.map((s) => {
          const current = item?.status === s;
          return (
            <form key={s} action={async () => {
              const wasFinished = item?.status === 'concluido';
              const r = await setStatus(workId, workPath, s);
              setJustFinished(Boolean(r?.ok) && s === 'concluido' && !wasFinished);
            }}>
              <button
                type="submit"
                aria-pressed={current}
                onClick={(e) => {
                  if (!current && s !== 'concluido' && item?.status === 'concluido' && hasReviewData && !window.confirm(CLEAR_WARNING)) e.preventDefault();
                }}
                className={`rounded-full border px-4 py-1.5 text-sm ${current ? 'border-fg bg-fg font-semibold text-bg' : 'border-line-strong bg-bg/60 text-fg hover:border-fg'}`}
              >
                {statusLabel(kind, s)}
              </button>
            </form>
          );
        })}
        {item && (
          <form action={removeFromList.bind(null, workId, workPath)}>
            <button
              type="submit"
              onClick={(e) => { if (hasReviewData && !window.confirm(CLEAR_WARNING)) e.preventDefault(); }}
              className="text-sm text-muted hover:underline"
            >
              Remover da lista
            </button>
          </form>
        )}
      </div>
      {justFinished && !banned && <TellTheClub workId={workId} />}
      {item?.status === 'concluido' && <ReviewForm kind={kind} workId={workId} workPath={workPath} item={item} />}
    </section>
  );
}
