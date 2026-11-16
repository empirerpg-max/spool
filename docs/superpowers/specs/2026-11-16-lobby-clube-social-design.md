# Lobby — Clube social, telas iniciais e avaliações

**Data:** 2026-11-16
**Status:** em revisão

## 1. Intenção e o porquê

"O Lobby precisa ser um **clube digital**" (usuário). Hoje o Lobby gira em torno das obras (lista, onde assistir, avisos, comunidade por obra). Falta a parte de **pessoas**: quem está no clube, o que cada um está assistindo/lendo e conversas que nascem de alguém, não só de uma obra. Também falta uma tela inicial que dê motivo para voltar todo dia e uma porta de entrada que explique o clube para quem chega com convite.

## 2. O que será construído (três etapas, nesta ordem)

### Etapa 1 — Clube social

**Perfil** (decisões do usuário: foto, biografia, timeline própria, seguidores/seguindo)
- Foto de perfil, biografia, **nome no perfil opcional** (escolhido pela pessoa; o nome/sobrenome do cadastro continuam privados — *minha decisão*).
- Contadores e listas de **Seguidores** e **Seguindo**.
- Abas: **Publicações** (timeline própria), **Resenhas** (resenhas publicadas) e **Lista** (só se a pessoa ativar "lista pública" em Minha conta — *minha decisão*; padrão privado, como hoje). A lista pública mostra **só as obras e o estado** (quero ver/vendo/visto) — **nunca as estrelas nem resenhas guardadas**, para não revelar quem deu qual nota (*minha decisão*).
- Página em `/@username` (ex.: `/@ana`).

**Seguir** (decisão do usuário: mão única)
- Seguir/deixar de seguir sem aprovação.

**Publicações** (decisões do usuário: sempre com um filme, série ou livro citado + legenda; início de conversa; curtidas)
- Cada publicação tem: obra citada (obrigatória), legenda (obrigatória), marcação "contém spoiler" (opcional — *minha decisão*, igual aos tópicos).
- **Respostas** embaixo (uma conversa por publicação; respostas também podem ser marcadas como spoiler).
- **Curtidas** em publicações (curtir respostas fica fora — *minha decisão*).
- Onde aparece: no perfil do autor, na timeline de quem segue o autor e numa aba **"Publicações"** da comunidade da obra (*minha decisão*, aprovada pelo usuário na conversa).
- Regras da comunidade valem iguais aos tópicos: precisa de @, banido não publica, links de sites piratas bloqueados, limite contra spam, denúncia e remoção pelo Admin.

**Acompanhar conversas** (pedido do usuário na primeira mensagem sobre a parte social)
- Botão "Acompanhar" em tópicos da comunidade e em publicações. Quem publica/abre um tópico acompanha automaticamente o que criou.

**Avisos no sino** (*minha decisão*, aprovada): alguém te seguiu; curtiu sua publicação; respondeu sua publicação; nova resposta numa conversa que você acompanha. Agrupados quando repetidos ("@ana e mais 3 curtiram…").

**Timeline** (decisão do usuário: publicações de quem segue + discussões que escolheu acompanhar)
- Mostra, do mais novo para o mais antigo: publicações de quem a pessoa segue, **resenhas publicadas por quem ela segue** (*minha decisão*) e novas respostas em conversas que ela acompanha.
- Ter a obra na lista **não** coloca a atividade daquela comunidade na timeline (seria barulhento); quem quiser acompanha tópicos específicos. A ideia antiga de "membro da comunidade = vê a atividade no Início" é substituída por isso (*minha decisão*).
- Pessoa nova, que ainda não segue ninguém: sugestões de membros ativos para seguir e comunidades mais movimentadas da semana.
- Montada na hora em que a pessoa abre (sem pré-cálculo — *minha decisão*; adequado ao tamanho de um clube).

### Etapa 2 — Telas iniciais

**Logado** (decisão do usuário: últimos lançamentos de filmes, séries e livros por seção + últimos posts de quem segue)
- Fileiras de **Lançamentos**, gerais (não só da lista): **Filmes** (nos cinemas do Brasil + em breve nos cinemas), **Séries** (no ar / estreias recentes), **Livros** (lançamentos recentes em português — fonte menos precisa, aceito pelo usuário).
  - Montadas direto das fontes na hora (TMDB, Google Books) e guardadas por algumas horas só para exibir; **não entram no banco nem na conferência diária** (respeita a regra de não copiar catálogos — *minha decisão*). As obras só são guardadas quando alguém abre a página delas, como hoje.
  - "Chegou no streaming" **geral** não é possível (nenhuma fonte gratuita informa a data de chegada para todas as obras); essa novidade continua só nos avisos da lista (*minha decisão*).
- Abaixo (celular) ou ao lado (computador): a **Timeline**.
- Avisos da lista ficam no sino, não repetidos na tela inicial.

**Sem login** (decisão do usuário: explicação + exibição rápida de como funciona)
- Chamada "Um clube para quem ama filmes, séries e livros" + botões **Tenho um convite** (→ criar conta) e **Já sou membro** (→ entrar) + linha "Ainda não tem convite? Peça para quem te indicou o Lobby".
- **Como funciona** em três passos (lista; onde assistir e avisos; conversar).
- **Por dentro do clube**: cartões de exemplo (publicação e comunidade), marcados "exemplo", sem conteúdo real de membros.
- **Nos cinemas esta semana** com dados reais.
- A busca e as páginas de obra continuam abertas; perfis, publicações e timeline só para membros.

### Etapa 3 — Avaliações (pedido do usuário)
- **Nota do Lobby**: média das estrelas que os membros dão na lista + quantas pessoas avaliaram, sem revelar quem deu qual nota. Mostrada a partir de 3 avaliações (*minha decisão*, evita média enganosa).
- **IMDb e Rotten Tomatoes** em filmes e séries, via serviço **OMDb** (gratuito até 1.000 consultas/dia; o usuário cria a chave). Livros só têm a nota do Lobby.
- Notas externas guardadas junto da obra e atualizadas com a conferência diária.

## 3. Fora do escopo
- Mensagens privadas, grupos/comunidades criadas por usuários, moderadores voluntários.
- Publicações sem obra citada (regra do usuário).
- Perfis privados / aprovação de seguidores (seguir é de mão única).
- Curtir respostas, republicar ("repost"), citar publicação.
- Lista de espera para quem não tem convite.

## 4. Anti-objetivos
- Virar rede social genérica sem foco em obras (toda publicação cita uma obra).
- Expor dados pessoais: nome/sobrenome do cadastro, nascimento e e-mail nunca aparecem; lista privada por padrão.
- Timeline vazia para quem chega (sempre sugerir pessoas e comunidades).
- Mostrar **publicações, perfis e timeline** de membros para quem não é membro. As **comunidades das obras (tópicos)** continuam abertas para leitura, como hoje (*minha decisão*: mantém as páginas encontráveis no Google e não muda o que já existe; a área "Por dentro do clube" usa exemplos).

## 5. Restrições
- Mesma base do Lobby (site atual, banco atual), mesmo visual "Saguão".
- Português e termos leigos; nada de chave para a dona colar no chat (a do OMDb vai na Vercel).
- Custos zero: foto de perfil no armazenamento gratuito do Supabase (limite de tamanho, recorte quadrado).
- Regras de segurança no banco, como no resto do Lobby.

## 6. Abordagens consideradas (publicações)

| | Caminho | Ganho | Custo |
|---|---|---|---|
| **A ✅ escolhido** | Publicação é uma peça nova, ligada ao perfil e à obra, com curtidas e respostas próprias, aparecendo também numa aba da comunidade | Publicação ≠ tópico; cara de rede social; reaproveita as regras de moderação | Mais construção |
| B | Publicação vira um tópico da comunidade | Mais rápido | Mistura posts pessoais com debates; difícil ter curtidas/perfil/timeline |

Descartado: timeline pré-calculada por pessoa (desnecessária para um clube).

## 7. O que fica para quem constrói
- Desenho exato das telas dentro do visual Saguão.
- Paginação/rolagem da timeline.
- Tamanho máximo da legenda e da biografia (sugestão: 1000 e 160 caracteres).
- Recorte e compressão da foto.
- Quais fontes exatas usar para as fileiras de lançamentos.
