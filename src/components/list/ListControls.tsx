'use client';

import Link from 'next/link';
import { useActionState } from 'react';
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
};

const box = 'space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800';
const CLEAR_WARNING = 'Isso apaga sua nota e sua resenha desta obra. Continuar?';

function ReviewForm({ kind, workId, workPath, item }: { kind: WorkKind; workId: string; workPath: string; item: ListItem }) {
  const [state, action, pending] = useActionState<ListActionState, FormData>(saveReview.bind(null, workId, workPath), {});
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3">
      <StarRating name="rating" defaultValue={item.rating} />
      {err.rating && <p role="alert" className="text-sm text-red-600">{err.rating}</p>}
      <label className="block space-y-1">
        <span className="text-sm font-medium">{kind === 'book' ? 'Quando terminou de ler' : 'Quando assistiu'}</span>
        <input type="date" name="finishedOn" defaultValue={item.finishedOn ?? ''} className="rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 dark:border-neutral-700" />
      </label>
      {err.finishedOn && <p role="alert" className="text-sm text-red-600">{err.finishedOn}</p>}
      <label className="block space-y-1">
        <span className="text-sm font-medium">Resenha</span>
        <textarea name="review" rows={5} maxLength={10000} defaultValue={item.review ?? ''} className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="reviewHasSpoiler" defaultChecked={item.reviewHasSpoiler} />
        <span>Contém spoiler</span>
      </label>
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="publish" defaultChecked={item.published} aria-describedby="publish-help" />
          <span>Publicar na comunidade</span>
        </label>
        <p id="publish-help" className="ml-6 text-xs text-neutral-500">Se marcado, sua resenha vira um tópico na comunidade desta obra.</p>
      </div>
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
      {state.ok && <p role="status" className="text-green-700 dark:text-green-400">Salvo!</p>}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900">Salvar</button>
        {item.published && item.reviewTopicId && (
          <Link href={`${workPath}/topicos/${item.reviewTopicId}`} className="text-sm underline">Ver na comunidade</Link>
        )}
      </div>
    </form>
  );
}

export function ListControls({ kind, workId, workPath, item, signedIn, hasUsername }: Props) {
  if (!workId) return <div className={box}><p className="text-neutral-500">Lista indisponível no momento</p></div>;
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
            <form key={s} action={setStatus.bind(null, workId, workPath, s)}>
              <button
                type="submit"
                aria-pressed={current}
                onClick={(e) => {
                  if (!current && s !== 'concluido' && item?.status === 'concluido' && hasReviewData && !window.confirm(CLEAR_WARNING)) e.preventDefault();
                }}
                className={`rounded-full border px-4 py-1.5 text-sm ${current ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900' : 'border-neutral-300 dark:border-neutral-700'}`}
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
              className="text-sm text-neutral-500 hover:underline"
            >
              Remover da lista
            </button>
          </form>
        )}
      </div>
      {item?.status === 'concluido' && <ReviewForm kind={kind} workId={workId} workPath={workPath} item={item} />}
    </section>
  );
}
