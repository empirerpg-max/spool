import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/social/profile-actions', () => ({ updateProfile: vi.fn() }));
import { ProfileForm } from '@/app/minha-conta/ProfileForm';

describe('ProfileForm', () => {
  it('fills the saved values, counts bio characters and links to the profile', () => {
    render(<ProfileForm username="ana" displayName="Ana" bio="Oi" listPublic shareActivity={null} shareRatings={false} />);
    expect(screen.getByLabelText('Nome no perfil')).toHaveValue('Ana');
    expect(screen.getByLabelText('Mostrar minha lista no meu perfil')).toBeChecked();
    expect(screen.getByText(/estrelas e resenhas guardadas nunca aparecem/)).toBeInTheDocument();
    expect(screen.getByText('2/160')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Biografia'), { target: { value: 'Gosto de terror' } });
    expect(screen.getByText('15/160')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver meu perfil' })).toHaveAttribute('href', '/@ana');
  });
  it('keeps the list private by default', () => {
    render(<ProfileForm username="ana" displayName={null} bio={null} listPublic={false} shareActivity={null} shareRatings={false} />);
    expect(screen.getByLabelText('Mostrar minha lista no meu perfil')).not.toBeChecked();
    expect(screen.getByText('0/160')).toBeInTheDocument();
  });

  it('shows the activity toggles; ratings only while the activity is on', () => {
    render(<ProfileForm username="ana" displayName={null} bio={null} listPublic={false} shareActivity={null} shareRatings={false} />);
    const activity = screen.getByLabelText('Mostrar minha atividade para quem me segue');
    const ratings = screen.getByLabelText('Mostrar minhas notas junto');
    expect(screen.getByText('Quem te segue vê quando você marca algo como Quero ver, Vendo ou Visto.')).toBeInTheDocument();
    expect(activity).not.toBeChecked();
    expect(ratings).toBeDisabled();
    fireEvent.click(activity);
    expect(activity).toBeChecked();
    expect(ratings).toBeEnabled();
    expect(ratings).not.toBeChecked();
  });
  it('fills the saved activity choices', () => {
    render(<ProfileForm username="ana" displayName={null} bio={null} listPublic={false} shareActivity shareRatings />);
    expect(screen.getByLabelText('Mostrar minha atividade para quem me segue')).toBeChecked();
    expect(screen.getByLabelText('Mostrar minhas notas junto')).toBeChecked();
    expect(screen.getByLabelText('Mostrar minhas notas junto')).toBeEnabled();
  });
});
