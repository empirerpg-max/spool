import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Spoiler, spoilerLabel } from '@/components/community/Spoiler';

describe('Spoiler', () => {
  it('hides children until opened', () => {
    const { container } = render(<Spoiler><p>Ele morre</p></Spoiler>);
    const details = container.querySelector('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('Contém spoiler — clique para ver')).toBeInTheDocument();
  });
  it('shows season/episode label', () => {
    render(<Spoiler label={spoilerLabel(2, 5)}>x</Spoiler>);
    expect(screen.getByText(/até T2E5/)).toBeInTheDocument();
  });
  it('builds labels', () => {
    expect(spoilerLabel(2, 5)).toBe('até T2E5');
    expect(spoilerLabel(2, null)).toBe('até T2');
    expect(spoilerLabel(null, null)).toBeUndefined();
  });
});
