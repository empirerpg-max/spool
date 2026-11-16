import type { Availability, AvailabilityType, WorkKind } from '@/lib/catalog/types';

const LABELS: Record<Exclude<AvailabilityType, 'store'>, string> = {
  subscription: 'Assinatura',
  free: 'Grátis',
  ads: 'Grátis com anúncios',
  rent: 'Alugar',
  buy: 'Comprar',
};
const ORDER = Object.keys(LABELS) as Array<keyof typeof LABELS>;

function ProviderLink({ item }: { item: Availability }) {
  const body = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.logoUrl && <img src={item.logoUrl} alt="" width={28} height={28} className="rounded" />}
      <span>{item.provider}</span>
    </>
  );
  const cls = 'flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2';
  return item.link ? (
    <a href={item.link} target="_blank" rel="noopener noreferrer" className={`${cls} hover:bg-surface-2`}>
      {body}
    </a>
  ) : (
    <span className={cls}>{body}</span>
  );
}

export function AvailabilityList({ kind, items }: { kind: WorkKind; items: Availability[] }) {
  if (kind === 'book') {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Onde comprar</h2>
        <ul className="flex flex-wrap gap-2">
          {items.map((i) => <li key={`${i.provider}-${i.type}`}><ProviderLink item={i} /></li>)}
        </ul>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Onde assistir</h2>
      {items.length === 0 ? (
        <p className="text-muted">Ainda não disponível em streaming no Brasil</p>
      ) : (
        <>
          {ORDER.filter((t) => items.some((i) => i.type === t)).map((t) => (
            <div key={t} className="space-y-2">
              <h3 className="text-sm font-medium text-muted">{LABELS[t]}</h3>
              <ul className="flex flex-wrap gap-2">
                {items.filter((i) => i.type === t).map((i) => <li key={i.provider}><ProviderLink item={i} /></li>)}
              </ul>
            </div>
          ))}
          <p className="text-xs text-muted">
            <a href="https://www.justwatch.com/br" target="_blank" rel="noopener noreferrer" className="underline">
              Dados de streaming: JustWatch
            </a>
          </p>
        </>
      )}
    </section>
  );
}
