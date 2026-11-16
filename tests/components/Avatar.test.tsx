import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Avatar } from '@/components/social/Avatar';

describe('Avatar', () => {
  it('shows the photo when there is one', () => {
    const { container } = render(<Avatar url="https://x.supabase.co/a.webp?v=1" name="ana" size="lg" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://x.supabase.co/a.webp?v=1');
    expect(img).toHaveClass('size-24');
  });
  it('falls back to the first letter of the name', () => {
    render(<Avatar url={null} name="ana souza" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
  it('skips symbols and handles an empty name', () => {
    render(<Avatar url={null} name="_beto" />);
    expect(screen.getByText('B')).toBeInTheDocument();
    const { container } = render(<Avatar url={null} name="" />);
    expect(container.textContent).toBe('?');
  });
});
