const TMDB_LOGO =
  'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line px-4 py-6 text-xs text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={TMDB_LOGO} alt="TMDB" width={80} height={10} />
        <p>Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</p>
      </div>
    </footer>
  );
}
