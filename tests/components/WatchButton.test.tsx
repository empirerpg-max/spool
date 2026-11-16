import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const actions = vi.hoisted(() => ({ watch: vi.fn(async () => ({ ok: true })), unwatch: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/lib/social/actions', () => actions);

import { WatchButton } from '@/components/social/WatchButton';

const ID = '6f1c1a3e-0e6b-4d5b-9b52-1c2d3e4f5a6b';
beforeEach(() => vi.clearAllMocks());

describe('WatchButton', () => {
  it('Acompanhar starts following the conversation', async () => {
    render(<WatchButton target="topic" id={ID} path="/obra/filme/603/topicos/x" initialWatching={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Acompanhar' }));
    expect(actions.watch).toHaveBeenCalledWith('topic', ID, '/obra/filme/603/topicos/x');
    expect(await screen.findByRole('button', { name: 'Acompanhando' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('Acompanhando stops following', () => {
    render(<WatchButton target="post" id={ID} path={`/p/${ID}`} initialWatching />);
    fireEvent.click(screen.getByRole('button', { name: 'Acompanhando' }));
    expect(actions.unwatch).toHaveBeenCalledWith('post', ID, `/p/${ID}`);
  });
});
