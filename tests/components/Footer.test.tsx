import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Footer } from '@/components/Footer';

describe('Footer', () => {
  it('renders TMDB attribution', () => {
    render(<Footer />);
    expect(
      screen.getByText('Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'TMDB' })).toBeInTheDocument();
  });
});

describe('Footer links', () => {
  it('links to the terms and the privacy policy', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos');
    expect(screen.getByRole('link', { name: 'Privacidade' })).toHaveAttribute('href', '/privacidade');
  });
});
