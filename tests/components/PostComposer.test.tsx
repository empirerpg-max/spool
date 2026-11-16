import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const actions = vi.hoisted(() => ({
  createPost: vi.fn(async () => ({})),
  searchWorks: vi.fn(async () => ({ hits: [{ kind: 'movie', externalId: '603', title: 'Matrix', year: 1999, posterUrl: null }] })),
}));
vi.mock('@/lib/social/actions', () => actions);

import { PostComposer } from '@/components/social/PostComposer';

beforeEach(() => vi.clearAllMocks());

const form = () => screen.getByRole('button', { name: 'Publicar' }).closest('form') as HTMLFormElement;

describe('PostComposer', () => {
  it('refuses to publish without a work', async () => {
    render(<PostComposer />);
    fireEvent.change(screen.getByLabelText('Legenda'), { target: { value: 'Que filme!' } });
    fireEvent.submit(form());
    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha um filme, série ou livro');
    expect(actions.createPost).not.toHaveBeenCalled();
  });

  it('picks a work from the search and sends it along', async () => {
    render(<PostComposer />);
    fireEvent.change(screen.getByLabelText('Sobre qual obra?'), { target: { value: 'matrix' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(actions.searchWorks).toHaveBeenCalledWith('matrix');
    fireEvent.click(await screen.findByRole('button', { name: /Matrix/ }));
    expect(screen.getByText('Matrix')).toBeInTheDocument();
    expect(form().querySelector('input[name="kind"]')).toHaveValue('movie');
    expect(form().querySelector('input[name="externalId"]')).toHaveValue('603');
    expect(screen.getByRole('button', { name: 'Trocar obra' })).toBeInTheDocument();
  });

  it('with a fixed work, no picker is shown and the work id is sent', () => {
    render(<PostComposer work={{ id: 'w1', kind: 'book', externalId: 'OL1W', title: 'Duna', posterUrl: null, year: 1965 }} />);
    expect(screen.queryByLabelText('Sobre qual obra?')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Trocar obra' })).toBeNull();
    expect(form().querySelector('input[name="workId"]')).toHaveValue('w1');
  });

  it('counts the caption characters', async () => {
    render(<PostComposer />);
    fireEvent.change(screen.getByLabelText('Legenda'), { target: { value: 'Oi' } });
    await waitFor(() => expect(screen.getByText('2/1000')).toBeInTheDocument());
    expect(screen.getByLabelText('Contém spoiler')).not.toBeChecked();
  });
});
