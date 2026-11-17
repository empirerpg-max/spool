import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AlertList } from '@/components/alerts/AlertList';

// The unread badge now lives on the Avisos item of the navigation (tests/components/NavBar.test.tsx).
describe('AlertList', () => {
  it('lists alerts with links and highlights unread ones', () => {
    render(<AlertList alerts={[
      { id: 1, title: 'Matrix chegou na Max', url: '/obra/filme/603', createdAt: new Date().toISOString(), unread: true },
      { id: 2, title: 'The Bear: temporada 4 estreou', url: '/obra/serie/136315', createdAt: new Date().toISOString(), unread: false },
    ]} />);
    expect(screen.getByRole('link', { name: /Matrix chegou na Max/ })).toHaveAttribute('href', '/obra/filme/603');
    expect(screen.getAllByText('Novo')).toHaveLength(1);
  });
  it('explains the empty state', () => {
    render(<AlertList alerts={[]} />);
    expect(screen.getByText('Nenhum aviso por enquanto. Adicione obras à sua lista para ser avisado quando estrearem ou chegarem num streaming.')).toBeInTheDocument();
  });
});
