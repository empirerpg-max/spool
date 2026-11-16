# Lobby — instruções para o Claude

## Como falar com a pessoa dona do projeto

- **Sempre em português do Brasil.**
- **Sempre em termos leigos:** explicar o que muda para quem usa o site, não como o código funciona. Evitar jargão técnico (nomes de funções, arquivos, comandos, "RLS", "migration", "deploy" etc.). Quando um termo técnico for inevitável, explicar em uma frase simples.
- A pessoa não programa no próprio computador: tudo é feito pelo GitHub, pela Vercel e pelo Supabase, pelo navegador. Passos para ela devem ser cliques no navegador, nunca comandos de terminal.
- Nunca pedir chaves ou senhas no chat. Para isso, usar os painéis (Vercel, Supabase, GitHub Secrets) ou o formulário seguro.

## Como trabalhar

- A pessoa autorizou abrir e juntar Pull Requests sem pedir confirmação, depois que a verificação automática (CI) passar.
- Parar e perguntar só em decisões de produto, ações que apagam dados, ou quando algo depende de um painel ao qual o Claude não tem acesso.

## O projeto

- Lobby: rede social para conversar sobre filmes, séries e livros, com lista pessoal, onde assistir/comprar no Brasil e uma comunidade por obra.
- Design: `docs/superpowers/specs/` · Planos: `docs/superpowers/plans/` · Configuração de chaves: `docs/setup-chaves.md`.
- Site: Next.js na Vercel; banco e login no Supabase; mudanças no banco ficam em `supabase/migrations/` e são aplicadas pela automação "Banco de dados" quando entram no `main`.
- Testes: `npm test`, `npm run test:db` (precisa de Postgres local), `npm run typecheck`, `npm run lint`, `npm run build`.
