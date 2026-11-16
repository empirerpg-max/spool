import type { ReactNode } from 'react';
import { KindTag } from '@/components/KindTag';
import type { NormalizedWork } from '@/lib/catalog/types';
import { kindBgClass, kindTextClass } from '@/lib/kind-style';

type Props = {
  work: NormalizedWork;
  /** null when the community can't be loaded. */
  topicCount: number | null;
  badge?: ReactNode;
  children?: ReactNode;
};

function topicLabel(n: number) {
  if (n === 0) return 'Seja o primeiro a abrir um tópico';
  return n === 1 ? '1 tópico' : `${n} tópicos`;
}

function HeroBackground({ work }: { work: NormalizedWork }) {
  /* eslint-disable @next/next/no-img-element */
  if (work.backdropUrl) {
    return <img data-hero-bg="backdrop" src={work.backdropUrl} alt="" className="absolute inset-0 size-full object-cover object-top opacity-70" />;
  }
  if (work.posterUrl) {
    return <img data-hero-bg="poster" src={work.posterUrl} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-2xl" />;
  }
  /* eslint-enable @next/next/no-img-element */
  return <div data-hero-bg="gradient" className={`absolute inset-0 ${kindBgClass(work.kind)} opacity-25`} />;
}

export function WorkHero({ work, topicCount, badge, children }: Props) {
  const year = work.releaseDateBR?.slice(0, 4);
  return (
    <section className="relative -mx-4 -mt-6">
      <div className="relative h-48 overflow-hidden sm:h-72" aria-hidden="true">
        <HeroBackground work={work} />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/10 via-bg/50 to-bg" />
      </div>
      <div className="relative -mt-24 flex flex-col gap-5 px-4 sm:-mt-32 sm:flex-row sm:items-end">
        {work.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={work.posterUrl} alt={`Capa de ${work.title}`} width={176} height={264}
            className="w-28 shrink-0 rounded-lg shadow-2xl shadow-black/60 ring-1 ring-line sm:w-44" />
        ) : (
          <div className="flex aspect-[2/3] w-28 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm text-muted ring-1 ring-line sm:w-44">Sem capa</div>
        )}
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <KindTag kind={work.kind} />
            {badge}
          </div>
          <h1 className="break-words text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {work.title}
            {year && <span className="ml-2 align-middle text-xl font-medium text-muted sm:text-2xl">{year}</span>}
          </h1>
          {work.originalTitle && <p className="break-words text-muted">{work.originalTitle}</p>}
          {topicCount !== null && (
            <a href="#comunidade" className={`inline-block font-semibold ${kindTextClass(work.kind)} hover:underline`}>
              {topicLabel(topicCount)}
            </a>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
