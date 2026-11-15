import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StarRating } from '@/components/list/StarRating';

describe('StarRating', () => {
  it('offers ten half-star steps and no rating', () => {
    render(<StarRating name="rating" />);
    expect(screen.getAllByRole('radio')).toHaveLength(11);
    expect(screen.getByLabelText('Sem nota')).toBeChecked();
    expect(screen.getByLabelText('0,5 estrela')).toHaveAttribute('value', '0.5');
    expect(screen.getByLabelText('5 estrelas')).toHaveAttribute('value', '5');
  });
  it('checks the default value', () => {
    render(<StarRating name="rating" defaultValue={3.5} />);
    expect(screen.getByLabelText('3,5 estrelas')).toBeChecked();
    expect(screen.getByLabelText('Sem nota')).not.toBeChecked();
  });
});
