import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '@fontsource-variable/figtree';
import '@fontsource-variable/bricolage-grotesque';
import './globals.css';
import { Footer } from '@/components/Footer';
import { UserMenu } from '@/components/UserMenu';
import { Logo } from '@/components/Logo';
import { SearchBox } from '@/components/SearchBox';

export const metadata: Metadata = {
  title: 'Lobby',
  description: 'Filmes, séries e livros: sua lista, onde assistir e comunidades para conversar.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#17121f', colorScheme: 'dark' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            <Logo />
            <div className="hidden max-w-md flex-1 sm:block">
              <SearchBox compact />
            </div>
            <div className="ml-auto flex items-center gap-4">
              <Link href="/busca" aria-label="Buscar" className="text-muted sm:hidden">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </Link>
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
