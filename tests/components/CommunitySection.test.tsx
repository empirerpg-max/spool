import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CommunitySection } from '@/components/community/CommunitySection';
import type { TopicSummary } from '@/lib/community/queries';

const topic = (over: Partial<TopicSummary> = {}): TopicSummary => ({
  id: 't1', title: 'Sobre o final', hasSpoiler: false, spoilerSeason: null, spoilerEpisode: null,
  replyCount: 3, lastActivityAt: new Date().toISOString(), author: 'ana', ...over,
});
const base = { workPath: '/obra/filme/603', hasMore: false, page: 1 };

describe('CommunitySection', () => {
  it('shows unavailable state without a work id', () => {
    render(<CommunitySection {...base} workId={null} topics={[]} signedIn />);
    expect(screen.getByText('Comunidade indisponível no momento')).toBeInTheDocument();
    expect(screen.queryByText('Novo tópico')).toBeNull();
  });

  it('invites the first topic when empty', () => {
    render(<CommunitySection {...base} workId="w1" topics={[]} signedIn />);
    expect(screen.getByText('Ninguém começou a conversa ainda. Que tal abrir o primeiro tópico?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Novo tópico' })).toHaveAttribute('href', '/obra/filme/603/topicos/novo');
  });

  it('sends signed-out users to sign in first', () => {
    render(<CommunitySection {...base} workId="w1" topics={[]} signedIn={false} />);
    expect(screen.getByRole('link', { name: 'Novo tópico' })).toHaveAttribute('href', '/entrar?next=%2Fobra%2Ffilme%2F603%2Ftopicos%2Fnovo');
  });

  it('lists topics with reply counts and links', () => {
    render(<CommunitySection {...base} workId="w1" topics={[topic(), topic({ id: 't2', title: 'Outro', replyCount: 1, hasSpoiler: true })]} signedIn />);
    expect(screen.getByText('3 respostas')).toBeInTheDocument();
    expect(screen.getByText('1 resposta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sobre o final' })).toHaveAttribute('href', '/obra/filme/603/topicos/t1');
    expect(screen.getAllByText('spoiler')).toHaveLength(1);
    expect(screen.getAllByText('@ana')).toHaveLength(2);
  });

  it('links to the next page', () => {
    render(<CommunitySection {...base} workId="w1" topics={[topic()]} hasMore signedIn />);
    expect(screen.getByRole('link', { name: 'Mais tópicos' })).toHaveAttribute('href', '/obra/filme/603?pagina=2');
  });
});
