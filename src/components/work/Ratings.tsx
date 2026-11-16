import type { ExternalRatings, LobbyRating } from '@/lib/catalog/ratings';
import type { WorkKind } from '@/lib/catalog/types';

/** The Lobby average only appears from this many ratings (the database enforces it too). */
const MIN_RATINGS = 3;

const decimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const ratingCountLabel = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'avaliação' : 'avaliações'}`;

const label = 'text-xs font-semibold uppercase tracking-wider text-muted';
const value = 'text-lg font-bold';

type Props = { kind: WorkKind; lobby: LobbyRating | null; external: ExternalRatings | null };

/** Lobby rating and, for films and series, IMDb and Rotten Tomatoes. Pieces without data are left out. */
export function Ratings({ kind, lobby, external }: Props) {
  const ext = kind === 'book' ? null : external;
  const imdb = ext?.imdbId && ext.imdbRating != null ? { id: ext.imdbId, rating: ext.imdbRating } : null;
  const rt = ext?.rtScore ?? null;
  if (!lobby && !imdb && rt === null) return null;

  const showAverage = lobby && lobby.average != null && lobby.count >= MIN_RATINGS;

  return (
    <dl aria-label="Notas" className="flex flex-wrap items-end gap-x-6 gap-y-2">
      {lobby && (
        <div>
          <dt className={label}>Nota do Lobby</dt>
          {showAverage ? (
            <dd className="flex items-baseline gap-2">
              <span className={`${value} text-warn`}>{decimal(lobby.average!)} ★</span>
              <span className="text-sm text-muted">{ratingCountLabel(lobby.count)}</span>
            </dd>
          ) : (
            <dd className="text-sm text-muted">Poucas avaliações no Lobby ainda</dd>
          )}
        </div>
      )}
      {imdb && (
        <div>
          <dt className={label}>IMDb</dt>
          <dd>
            <a href={`https://www.imdb.com/title/${imdb.id}/`} target="_blank" rel="noopener noreferrer"
              aria-label={`IMDb: ${decimal(imdb.rating)} de 10 (abre em outra aba)`}
              className={`${value} hover:underline`}>
              {decimal(imdb.rating)}/10
            </a>
          </dd>
        </div>
      )}
      {rt !== null && (
        <div>
          <dt className={label}>Rotten Tomatoes</dt>
          <dd className={value}>{rt}%</dd>
        </div>
      )}
    </dl>
  );
}
