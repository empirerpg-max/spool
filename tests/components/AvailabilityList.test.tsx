import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AvailabilityList } from '@/components/work/AvailabilityList';

describe('AvailabilityList', () => {
  it('movie with subscription shows label and JustWatch credit', () => {
    render(<AvailabilityList kind="movie" items={[{ provider: 'Max', type: 'subscription', logoUrl: null, link: 'https://x' }]} />);
    expect(screen.getByRole('heading', { name: 'Onde assistir' })).toBeInTheDocument();
    expect(screen.getByText('Assinatura')).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dados de streaming: JustWatch' })).toHaveAttribute('href', 'https://www.justwatch.com/br');
  });

  it('movie without providers shows empty state', () => {
    render(<AvailabilityList kind="series" items={[]} />);
    expect(screen.getByText('Ainda não disponível em streaming no Brasil')).toBeInTheDocument();
    expect(screen.queryByText('Dados de streaming: JustWatch')).toBeNull();
  });

  it('book shows store links opening in new tab', () => {
    render(<AvailabilityList kind="book" items={[{ provider: 'Amazon', type: 'store', logoUrl: null, link: 'https://www.amazon.com.br/s?k=1' }]} />);
    expect(screen.getByRole('heading', { name: 'Onde comprar' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Amazon/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByText('Dados de streaming: JustWatch')).toBeNull();
  });
});
