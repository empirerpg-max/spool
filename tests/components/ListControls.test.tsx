import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setStatus = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<{ ok: boolean }>>(async () => ({ ok: true })));
vi.mock('@/lib/list/actions', () => ({ setStatus, saveReview: vi.fn(), removeFromList: vi.fn() }));
import { ListControls } from '@/components/list/ListControls';
import type { ListItem } from '@/lib/list/types';

const item = (over: Partial<ListItem> = {}): ListItem => ({
  workId: 'w1', status: 'quero', rating: null, review: null, reviewHasSpoiler: false, finishedOn: null,
  published: false, removedByModeration: false, reviewTopicId: null, updatedAt: '2026-11-15T00:00:00Z', ...over,
});
const base = { workPath: '/obra/filme/603', signedIn: true, hasUsername: true };

describe('ListControls', () => {
  it('shows unavailable without work id', () => {
    render(<ListControls {...base} kind="movie" workId={null} item={null} />);
    expect(screen.getByText('Lista indisponível no momento')).toBeInTheDocument();
  });

  it('asks signed-out people to sign in', () => {
    render(<ListControls {...base} signedIn={false} kind="movie" workId="w1" item={null} />);
    expect(screen.getByRole('link', { name: 'Entre para salvar na sua lista' })).toHaveAttribute('href', '/entrar?next=%2Fobra%2Ffilme%2F603');
  });

  it('asks for a username first', () => {
    render(<ListControls {...base} hasUsername={false} kind="movie" workId="w1" item={null} />);
    expect(screen.getByRole('link', { name: 'Escolha um nome de usuário para usar a lista' })).toHaveAttribute('href', '/bem-vindo?next=%2Fobra%2Ffilme%2F603');
  });

  it('offers reading states for books with none selected', () => {
    render(<ListControls {...base} kind="book" workId="w1" item={null} />);
    for (const name of ['Quero ler', 'Lendo', 'Lido']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.queryByRole('button', { name: 'Remover da lista' })).toBeNull();
  });

  it('highlights the current state', () => {
    render(<ListControls {...base} kind="movie" workId="w1" item={item({ status: 'andamento' })} />);
    expect(screen.getByRole('button', { name: 'Vendo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Remover da lista' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Publicar na comunidade')).toBeNull();
  });

  it('shows the review form when done, with publish state', () => {
    render(<ListControls {...base} kind="movie" workId="w1" item={item({ status: 'concluido', review: 'Ótimo', rating: 4, published: true, reviewTopicId: 't1' })} />);
    expect(screen.getByLabelText('Publicar na comunidade')).toBeChecked();
    expect(screen.getByRole('link', { name: 'Ver na comunidade' })).toHaveAttribute('href', '/obra/filme/603/topicos/t1');
    expect(screen.getByLabelText('Resenha')).toHaveValue('Ótimo');
    expect(screen.getByLabelText('4 estrelas')).toBeChecked();
  });

  it('explains a review removed by moderation and hides the publish option', () => {
    render(<ListControls {...base} kind="movie" workId="w1" item={item({ status: 'concluido', review: 'x', reviewTopicId: 't1', removedByModeration: true })} />);
    expect(screen.getByText('Sua resenha foi removida da comunidade pela moderação. Ela continua salva só para você.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Publicar na comunidade')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ver na comunidade' })).toBeNull();
  });

  describe('"Contar para o clube?"', () => {
    beforeEach(() => setStatus.mockClear());

    it('appears only after marking Visto/Lido, with a link to publish about the work', async () => {
      render(<ListControls {...base} kind="movie" workId="w1" item={item({ status: 'quero' })} />);
      expect(screen.queryByText('Contar para o clube?')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Vendo' }));
      await waitFor(() => expect(setStatus).toHaveBeenCalledWith('w1', '/obra/filme/603', 'andamento'));
      expect(screen.queryByText('Contar para o clube?')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Visto' }));
      expect(await screen.findByText('Contar para o clube?')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Publicar sobre esta obra' })).toHaveAttribute('href', '/publicar?obra=w1');
    });

    it('works for books (Lido)', async () => {
      render(<ListControls {...base} kind="book" workId="w2" item={null} />);
      fireEvent.click(screen.getByRole('button', { name: 'Lido' }));
      expect(await screen.findByRole('link', { name: 'Publicar sobre esta obra' })).toHaveAttribute('href', '/publicar?obra=w2');
    });

    it('does not appear when saving failed or for banned members', async () => {
      setStatus.mockResolvedValueOnce({ ok: false });
      const { unmount } = render(<ListControls {...base} kind="movie" workId="w1" item={null} />);
      fireEvent.click(screen.getByRole('button', { name: 'Visto' }));
      await waitFor(() => expect(setStatus).toHaveBeenCalledTimes(1));
      expect(screen.queryByText('Contar para o clube?')).toBeNull();
      unmount();
      render(<ListControls {...base} banned kind="movie" workId="w1" item={null} />);
      fireEvent.click(screen.getByRole('button', { name: 'Visto' }));
      await waitFor(() => expect(setStatus).toHaveBeenCalledTimes(2));
      expect(screen.queryByText('Contar para o clube?')).toBeNull();
    });
  });
});
