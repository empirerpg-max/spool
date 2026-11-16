import { describe, it, expect } from 'vitest';
import { groupActivity, mergeAlerts, type ActivityRow } from '@/lib/social/group-activity';

const POST = { id: 'p1', workTitle: 'Matrix' };
const TOPIC = { id: 't1', title: 'Sobre o final', href: '/obra/filme/603/topicos/t1' };
let n = 0;
const at = (minutesAgo: number) => new Date(Date.UTC(2026, 10, 16, 12, 0) - minutesAgo * 60_000).toISOString();
const row = (over: Partial<ActivityRow>): ActivityRow => ({
  id: ++n, kind: 'like', actor: 'ana', post: POST, topic: null, createdAt: at(0), unread: true, ...over,
});

describe('groupActivity', () => {
  it('one like', () => {
    expect(groupActivity([row({})], 'eu')).toEqual([
      expect.objectContaining({ title: '@ana curtiu sua publicação sobre Matrix', url: '/p/p1', unread: true }),
    ]);
  });

  it('likes on the same post are grouped, naming the most recent person', () => {
    const groups = groupActivity([
      row({ actor: 'bia', createdAt: at(1) }), row({ actor: 'ana', createdAt: at(0) }),
      row({ actor: 'cris', createdAt: at(5) }), row({ actor: 'duda', createdAt: at(9) }),
    ], 'eu');
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ title: '@ana e mais 3 curtiram sua publicação sobre Matrix', createdAt: at(0) });
  });

  it('likes on different posts stay apart', () => {
    const groups = groupActivity([row({}), row({ post: { id: 'p2', workTitle: 'Duna' }, createdAt: at(3) })], 'eu');
    expect(groups.map((g) => g.title)).toEqual(['@ana curtiu sua publicação sobre Matrix', '@ana curtiu sua publicação sobre Duna']);
  });

  it('follows are grouped together and link to the person or to my followers', () => {
    expect(groupActivity([row({ kind: 'follow', post: null })], 'eu')[0])
      .toMatchObject({ title: '@ana começou a seguir você', url: '/@ana' });
    const many = groupActivity([
      row({ kind: 'follow', post: null, actor: 'ana', createdAt: at(0) }),
      row({ kind: 'follow', post: null, actor: 'bia', createdAt: at(2) }),
      row({ kind: 'follow', post: null, actor: 'cris', createdAt: at(4) }),
    ], 'eu');
    expect(many).toEqual([expect.objectContaining({ title: '@ana e mais 2 começaram a seguir você', url: '/@eu/seguidores' })]);
  });

  it('replies to my post', () => {
    expect(groupActivity([row({ kind: 'reply' })], 'eu')[0].title).toBe('@ana respondeu sua publicação sobre Matrix');
    expect(groupActivity([row({ kind: 'reply' }), row({ kind: 'reply', actor: 'bia', createdAt: at(1) }), row({ kind: 'reply', createdAt: at(2) })], 'eu')[0].title)
      .toBe('@ana e mais 1 responderam sua publicação sobre Matrix');
  });

  it('new replies in a followed topic or post', () => {
    expect(groupActivity([row({ kind: 'watched_reply', post: null, topic: TOPIC })], 'eu')[0])
      .toMatchObject({ title: 'Nova resposta em uma conversa que você acompanha: Sobre o final', url: TOPIC.href });
    expect(groupActivity([
      row({ kind: 'watched_reply', post: null, topic: TOPIC }), row({ kind: 'watched_reply', post: null, topic: TOPIC, actor: 'bia', createdAt: at(1) }),
    ], 'eu')[0].title).toBe('2 novas respostas em uma conversa que você acompanha: Sobre o final');
    expect(groupActivity([row({ kind: 'watched_reply' })], 'eu')[0])
      .toMatchObject({ title: 'Nova resposta em uma conversa que você acompanha: publicação sobre Matrix', url: '/p/p1' });
  });

  it('keeps unread apart from already read, newest groups first', () => {
    const groups = groupActivity([
      row({ actor: 'bia', unread: false, createdAt: at(60) }),
      row({ actor: 'ana', unread: true, createdAt: at(1) }),
      row({ kind: 'follow', post: null, actor: 'cris', unread: true, createdAt: at(0) }),
    ], 'eu');
    expect(groups.map((g) => [g.title, g.unread])).toEqual([
      ['@cris começou a seguir você', true],
      ['@ana curtiu sua publicação sobre Matrix', true],
      ['@bia curtiu sua publicação sobre Matrix', false],
    ]);
  });

  it('skips rows whose target is gone', () => {
    expect(groupActivity([row({ post: null }), row({ kind: 'watched_reply', post: null, topic: null })], 'eu')).toEqual([]);
  });
});

describe('mergeAlerts', () => {
  it('mixes list alerts and social alerts, newest first', () => {
    const social = groupActivity([row({ createdAt: at(5) })], 'eu');
    const merged = mergeAlerts([
      { id: 1, title: 'Matrix chegou na Max', url: '/obra/filme/603', createdAt: at(0), unread: true },
      { id: 2, title: 'Duna estreou', url: '/obra/filme/1', createdAt: at(10), unread: false },
    ], social);
    expect(merged.map((a) => a.title)).toEqual(['Matrix chegou na Max', '@ana curtiu sua publicação sobre Matrix', 'Duna estreou']);
  });
});
