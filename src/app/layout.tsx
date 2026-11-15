import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { Footer } from '@/components/Footer';
import { UserMenu } from '@/components/UserMenu';

export const metadata: Metadata = {
  title: 'Lobby',
  description: 'Filmes, séries e livros: sua lista, onde assistir e comunidades para conversar.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = { themeColor: '#111111' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <header className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <Link href="/" className="text-lg font-bold">Lobby</Link>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
