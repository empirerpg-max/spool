import Link from 'next/link';

// Served from our own site: TMDB refuses images requested from other sites (403).
const TMDB_LOGO = '/tmdb-logo.svg';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line px-4 py-6 text-xs text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={TMDB_LOGO} alt="TMDB" width={80} height={10} />
        <p>Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</p>
        <nav aria-label="Documentos" className="flex gap-4 sm:ml-auto">
          <Link href="/termos" className="hover:text-fg">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-fg">Privacidade</Link>
        </nav>
      </div>
    </footer>
  );
}
