import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/', search: '' }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

import { NavBar } from '@/components/nav/NavBar';

type NavUser = { username: string | null; avatarUrl: string | null; isAdmin: boolean; banned: boolean };
const member = (over: Partial<NavUser> = {}): NavUser => ({ username: 'ana', avatarUrl: null, isAdmin: false, banned: false, ...over });

const bar = () => screen.getByRole('navigation', { name: 'Navegação principal' });

beforeEach(() => {
  nav.pathname = '/';
  nav.search = '';
});

/** Pretend the screen is a computer's (wide) instead of a phone's. */
function desktop() {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('min-width'), media: q, addEventListener: () => {}, removeEventListener: () => {},
  }));
}
afterEach(() => { vi.unstubAllGlobals(); });

describe('NavBar — member', () => {
  it('shows the five items with exact labels and destinations', () => {
    render(<NavBar user={member()} unread={0} />);
    const items = within(bar()).getAllByRole('listitem');
    expect(items.map((li) => li.querySelector('[data-label]')?.textContent)).toEqual(['Início', 'Explorar', 'Criar', 'Avisos', 'Perfil']);
    expect(within(bar()).getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    expect(within(bar()).getByRole('link', { name: 'Explorar' })).toHaveAttribute('href', '/explorar');
    expect(within(bar()).getByRole('link', { name: 'Avisos' })).toHaveAttribute('href', '/avisos');
    expect(within(bar()).getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/@ana');
  });

  it('sends people without a username to choose one', () => {
    render(<NavBar user={member({ username: null })} unread={0} />);
    expect(within(bar()).getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/bem-vindo');
  });

  it('shows the unread count on Avisos, capped at 9+', () => {
    const { rerender } = render(<NavBar user={member()} unread={12} />);
    expect(within(bar()).getByRole('link', { name: '12 avisos não lidos' })).toHaveAttribute('href', '/avisos');
    expect(within(bar()).getByText('9+')).toBeInTheDocument();
    rerender(<NavBar user={member()} unread={1} />);
    expect(within(bar()).getByRole('link', { name: '1 aviso não lido' })).toBeInTheDocument();
    expect(within(bar()).getByText('1')).toBeInTheDocument();
    rerender(<NavBar user={member()} unread={0} />);
    expect(within(bar()).getByRole('link', { name: 'Avisos' })).toBeInTheDocument();
    expect(within(bar()).queryByText('0')).toBeNull();
  });

  it('marks the current page; Início only on the exact home', () => {
    nav.pathname = '/explorar/filmes';
    const { rerender } = render(<NavBar user={member()} unread={0} />);
    expect(within(bar()).getByRole('link', { name: 'Explorar' })).toHaveAttribute('aria-current', 'page');
    expect(within(bar()).getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current');

    nav.pathname = '/';
    rerender(<NavBar user={member()} unread={0} />);
    expect(within(bar()).getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
    expect(within(bar()).getByRole('link', { name: 'Explorar' })).not.toHaveAttribute('aria-current');

    nav.pathname = '/@ana';
    rerender(<NavBar user={member()} unread={0} />);
    expect(within(bar()).getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page');

    nav.pathname = '/avisos';
    rerender(<NavBar user={member()} unread={0} />);
    expect(within(bar()).getByRole('link', { name: 'Avisos' })).toHaveAttribute('aria-current', 'page');
    expect(within(bar()).getByRole('link', { name: 'Perfil' })).not.toHaveAttribute('aria-current');
  });

  it('the Timeline counts as Início', () => {
    nav.pathname = '/timeline';
    render(<NavBar user={member()} unread={0} />);
    expect(within(bar()).getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page');
  });

  it('Criar opens a sheet with the two options and closes on Escape, back on the button', () => {
    render(<NavBar user={member()} unread={0} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    const button = within(bar()).getByRole('button', { name: 'Criar' });
    fireEvent.click(button);
    const sheet = screen.getByRole('dialog', { name: 'Criar' });
    expect(within(sheet).getByRole('link', { name: 'Publicar sobre uma obra' })).toHaveAttribute('href', '/publicar');
    expect(within(sheet).getByRole('link', { name: 'Adicionar à minha lista' })).toHaveAttribute('href', '/explorar?foco=busca');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('on phones the sheet is modal: Tab stays inside and it has a close button', () => {
    render(<NavBar user={member()} unread={0} />);
    const button = within(bar()).getByRole('button', { name: 'Criar' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(button);
    const sheet = screen.getByRole('dialog', { name: 'Criar' });
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    const publish = within(sheet).getByRole('link', { name: 'Publicar sobre uma obra' });
    const close = within(sheet).getByRole('button', { name: 'Fechar' });
    expect(publish).toHaveFocus();
    // Shift+Tab from the first option goes to the last one (the close button), Tab from it back to the first.
    fireEvent.keyDown(publish, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(publish).toHaveFocus();
    fireEvent.click(close);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(button).toHaveFocus();
  });

  it('on computers it is a small non-modal panel under the button', () => {
    desktop();
    render(<NavBar user={member()} unread={0} />);
    const button = within(bar()).getByRole('button', { name: 'Criar' });
    expect(button).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(button);
    expect(screen.queryByRole('dialog')).toBeNull();
    const panel = screen.getByRole('group', { name: 'Criar' });
    expect(panel).not.toHaveAttribute('aria-modal');
    expect(button).toHaveAttribute('aria-controls', panel.id);
    expect(within(panel).getByRole('link', { name: 'Publicar sobre uma obra' })).toHaveFocus();
    expect(within(panel).queryByRole('button', { name: 'Fechar' })).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Criar' })).toBeNull();
    expect(button).toHaveFocus();

    // Tabbing out of it closes it and leaves the focus where it went.
    fireEvent.click(button);
    const avisos = within(bar()).getByRole('link', { name: 'Avisos' });
    fireEvent.blur(within(screen.getByRole('group', { name: 'Criar' })).getByRole('link', { name: 'Adicionar à minha lista' }), { relatedTarget: avisos });
    expect(screen.queryByRole('group', { name: 'Criar' })).toBeNull();
    expect(button).not.toHaveFocus();
  });

  it('hides "Publicar sobre uma obra" for banned members and before choosing a username', () => {
    const { unmount } = render(<NavBar user={member({ banned: true })} unread={0} />);
    fireEvent.click(within(bar()).getByRole('button', { name: 'Criar' }));
    expect(screen.queryByRole('link', { name: 'Publicar sobre uma obra' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Adicionar à minha lista' })).toBeInTheDocument();
    unmount();

    render(<NavBar user={member({ username: null })} unread={0} />);
    fireEvent.click(within(bar()).getByRole('button', { name: 'Criar' }));
    expect(screen.queryByRole('link', { name: 'Publicar sobre uma obra' })).toBeNull();
  });

  it('desktop photo menu lists Meu perfil, Minha lista, Minha conta and Sair; Admin only for admins', () => {
    const { unmount } = render(<NavBar user={member()} unread={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Meu perfil' })).toHaveAttribute('href', '/@ana');
    expect(within(menu).getByRole('menuitem', { name: 'Minha lista' })).toHaveAttribute('href', '/minha-lista');
    expect(within(menu).getByRole('menuitem', { name: 'Minha conta' })).toHaveAttribute('href', '/minha-conta');
    expect(within(menu).getByRole('menuitem', { name: 'Sair' })).toHaveAttribute('type', 'submit');
    expect(within(menu).queryByRole('menuitem', { name: 'Admin' })).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    unmount();

    render(<NavBar user={member({ isAdmin: true })} unread={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu da conta' }));
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem').map((i) => i.textContent);
    expect(items).toEqual(['Meu perfil', 'Minha lista', 'Minha conta', 'Admin', 'Sair']);
    expect(screen.getByRole('menuitem', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('shows the profile photo when there is one', () => {
    const { container } = render(<NavBar user={member({ avatarUrl: 'https://x.supabase.co/a.webp' })} unread={0} />);
    expect(container.querySelector('img[src="https://x.supabase.co/a.webp"]')).not.toBeNull();
  });
});

describe('NavBar — visitor', () => {
  it('shows Início, Explorar and Entrar, returning to the current page after sign-in', () => {
    nav.pathname = '/obra/filme/603';
    nav.search = 'aba=comunidade';
    render(<NavBar user={null} unread={0} />);
    const labels = within(bar()).getAllByRole('listitem').map((li) => li.querySelector('[data-label]')?.textContent);
    expect(labels).toEqual(['Início', 'Explorar', 'Entrar']);
    expect(within(bar()).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar?next=%2Fobra%2Ffilme%2F603%3Faba%3Dcomunidade');
    expect(screen.queryByRole('button', { name: 'Criar' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Avisos/ })).toBeNull();
  });
});
