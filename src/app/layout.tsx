import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/figtree';
import '@fontsource-variable/bricolage-grotesque';
import './globals.css';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { SiteNav } from '@/components/nav/SiteNav';

export const metadata: Metadata = {
  title: 'Lobby',
  description: 'Filmes, séries e livros: sua lista, onde assistir e comunidades para conversar.',
  manifest: '/manifest.webmanifest',
};

// viewport-fit=cover lets the bottom bar reach the iPhone's rounded edge and pad itself above the home indicator.
export const viewport: Viewport = { themeColor: '#17121f', colorScheme: 'dark', viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Phones: room at the end of every page so the bottom bar never covers the last line.
    <html lang="pt-BR">
      <body className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] antialiased md:pb-0">
        {/* No backdrop blur on phones: it would pin the fixed bottom bar inside this header. */}
        <header className="sticky top-0 z-30 h-12 border-b border-line bg-bg px-4 md:h-14 md:bg-bg/90 md:backdrop-blur">
          <div className="mx-auto flex h-full max-w-6xl items-center gap-6">
            <Logo />
            <SiteNav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
