import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BellView } from '@/components/alerts/BellView';
import { AlertList } from '@/components/alerts/AlertList';

describe('BellView', () => {
  it('links to the alerts with an accessible count', () => {
    render(<BellView count={3} />);
    const link = screen.getByRole('link', { name: '3 avisos não lidos' });
    expect(link).toHaveAttribute('href', '/avisos');
    expect(screen.getByText('3')).toBeInTheDocument();
  });
  it('caps the badge and reads singular/none', () => {
    const { rerender } = render(<BellView count={12} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
    rerender(<BellView count={1} />);
    expect(screen.getByRole('link', { name: '1 aviso não lido' })).toBeInTheDocument();
    rerender(<BellView count={0} />);
    expect(screen.getByRole('link', { name: 'Avisos' })).toBeInTheDocument();
    expect(screen.queryByText('0')).toBeNull();
  });
});

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
