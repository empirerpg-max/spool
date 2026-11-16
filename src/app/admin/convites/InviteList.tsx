export type InviteRow = { code: string; note: string | null; createdAt: string; usedBy: string | null; usedAt: string | null };

const brDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso));

export function InviteList({ invites }: { invites: InviteRow[] }) {
  if (invites.length === 0) return <p className="text-muted">Nenhum convite gerado ainda.</p>;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
      {invites.map((i) => (
        <li key={i.code} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <span className="font-mono font-bold tracking-widest">{i.code}</span>
          {i.note && <span className="text-sm text-muted">{i.note}</span>}
          <span className={`ml-auto text-sm ${i.usedAt ? 'text-muted' : 'text-livro'}`}>
            {i.usedAt ? `Usado por @${i.usedBy ?? '?'} em ${brDate(i.usedAt)}` : 'Disponível'}
          </span>
        </li>
      ))}
    </ul>
  );
}
