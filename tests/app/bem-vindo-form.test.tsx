import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({ redirect: vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }) }));

const updates = vi.hoisted(() => [] as Array<{ table: string; values: Record<string, unknown> }>);
vi.mock('@/lib/supabase/session', () => ({
  createSessionClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => ({
        eq: async () => { updates.push({ table, values }); return { error: null }; },
      }),
    }),
  }),
}));

import { UsernameForm } from '@/app/bem-vindo/UsernameForm';
import { chooseUsername } from '@/app/bem-vindo/actions';

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

describe('/bem-vindo activity choice', () => {
  beforeEach(() => { updates.length = 0; });

  it('offers "Mostrar minha atividade para quem me segue", checked for new members', () => {
    render(<UsernameForm next="/" current={null} shareActivity={null} />);
    expect(screen.getByLabelText('Mostrar minha atividade para quem me segue')).toBeChecked();
    expect(screen.getByText('Quem te segue vê quando você marca algo como Quero ver, Vendo ou Visto.')).toBeInTheDocument();
  });

  it('keeps an earlier answer', () => {
    render(<UsernameForm next="/" current="ana" shareActivity={false} />);
    expect(screen.getByLabelText('Mostrar minha atividade para quem me segue')).not.toBeChecked();
  });

  it('saving the username saves the choice', async () => {
    await expect(chooseUsername({}, form({ username: 'ana_lee', shareActivity: 'on', next: '/' }))).rejects.toThrow('REDIRECT /');
    expect(updates).toEqual([
      { table: 'profiles', values: { username: 'ana_lee' } },
      { table: 'profile_details', values: { share_activity: true } },
    ]);
    updates.length = 0;
    await expect(chooseUsername({}, form({ username: 'ana_lee', next: '/' }))).rejects.toThrow('REDIRECT /');
    expect(updates[1]).toEqual({ table: 'profile_details', values: { share_activity: false } });
  });
});
