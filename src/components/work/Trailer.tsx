'use client';

import { useState } from 'react';

/** Thumbnail first; the YouTube player (and its cookies) only loads after a click. */
export function Trailer({ youtubeKey, title }: { youtubeKey: string | null; title: string }) {
  const [playing, setPlaying] = useState(false);
  if (!youtubeKey) return null;
  return (
    <div className="relative aspect-video w-full max-w-full overflow-hidden rounded-xl bg-surface">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1`}
          title={`Trailer de ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${youtubeKey}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-80" />
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-bg/30 font-display text-lg font-bold text-fg hover:bg-bg/10"
          >
            <span className="rounded-full bg-bg/80 px-5 py-2">▶ Trailer de {title}</span>
          </button>
        </>
      )}
    </div>
  );
}
