import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/social/PostCard', () => ({ PostCard: () => <div>post</div> }));
import { TimelineItem } from '@/components/social/TimelineItem';
import type { TimelineEntry } from '@/lib/social/types';

const actor = { id: 'u1', username: 'micael', displayName: 'Micael', avatarUrl: null };
const entry = (over: Partial<Extract<TimelineEntry, { type: 'list' }>> = {}): TimelineEntry => ({
  type: 'list', key: 'list:i1', createdAt: new Date().toISOString(), actor,
  work: { kind: 'movie', externalId: '693134', title: 'Duna: Parte Dois', posterUrl: 'https://img/duna.jpg', year: 2024 },
  href: '/obra/filme/693134', status: 'concluido', rating: 4.5, ...over,
});

describe('TimelineItem — list activity', () => {
  it('shows who, the verb, the work with its cover and the stars', () => {
    const { container } = render(<TimelineItem entry={entry()} />);
    expect(screen.getByRole('link', { name: '@micael' })).toHaveAttribute('href', '/@micael');
    expect(screen.getByText(/viu/)).toBeInTheDocument();
    const work = screen.getByRole('link', { name: 'Duna: Parte Dois' });
    expect(work).toHaveAttribute('href', '/obra/filme/693134');
    expect(container.querySelector('img[src="https://img/duna.jpg"]')).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Nota 4,5 de 5' })).toHaveTextContent('★★★★½');
  });

  it('has no stars without a rating and uses reading verbs for books', () => {
    render(<TimelineItem entry={entry({ status: 'andamento', rating: null, work: { kind: 'book', externalId: 'OL1W', title: 'Torto Arado', posterUrl: null, year: 2019 }, href: '/obra/livro/OL1W' })} />);
    expect(screen.getByText(/está lendo/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Nota/ })).toBeNull();
    expect(screen.queryByText(/★/)).toBeNull();
  });
});
