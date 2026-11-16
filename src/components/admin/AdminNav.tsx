import Link from 'next/link';

const ITEMS = [
  ['/admin', 'Denúncias'],
  ['/admin/convites', 'Convites'],
  ['/admin/usuarios', 'Usuários'],
  ['/admin/dominios', 'Domínios bloqueados'],
] as const;

export function AdminNav({ current }: { current: (typeof ITEMS)[number][0] }) {
  return (
    <nav aria-label="Administração" className="flex flex-wrap gap-4 text-sm">
      {ITEMS.map(([href, label]) =>
        href === current ? (
          <span key={href} aria-current="page" className="font-semibold">{label}</span>
        ) : (
          <Link key={href} href={href} className="text-muted underline hover:text-fg">{label}</Link>
        ),
      )}
    </nav>
  );
}
