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
