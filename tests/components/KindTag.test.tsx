import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KindTag } from '@/components/KindTag';
import { Logo } from '@/components/Logo';

describe('KindTag', () => {
  it('shows the kind name on its color', () => {
    render(<KindTag kind="movie" />);
    expect(screen.getByText('Filme')).toHaveClass('bg-film');
  });
});

describe('Logo', () => {
  it('links home with an accessible name', () => {
    render(<Logo />);
    expect(screen.getByRole('link', { name: 'Lobby' })).toHaveAttribute('href', '/');
  });
});
