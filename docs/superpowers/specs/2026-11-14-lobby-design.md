# Lobby — Documento de design

**Data:** 2026-11-14
**Status:** aguardando aprovação

## 1. Intenção e o porquê

O Lobby é uma rede social para **discutir filmes, séries e livros**. Não é um serviço de streaming nem distribui conteúdo. Ele reúne em um só lugar o que hoje fica espalhado entre Letterboxd/Filmow (filmes), sites de séries e Skoob/Goodreads (livros):

- uma **lista pessoal** única (watchlist/readlist) com filmes, séries e livros juntos;
- **avisos** quando algo da lista é lançado ou fica disponível;
- **onde assistir ou comprar**, de forma imediata;
- **comunidades por obra**, como no Orkut: cada filme, série ou livro é uma comunidade com tópicos de discussão.

## 2. Objetivos

1. **Catálogo:** todo filme, série e livro tem uma página com capa/pôster, sinopse, data de lançamento (inclusive futura), trailer (filmes e séries), elenco/autor e **onde assistir/comprar no Brasil**.
2. **Lista pessoal:** cada pessoa adiciona obras com estado: *quero ver/ler*, *vendo/lendo*, *visto/lido*.
3. **Avisos** (por padrão, para toda obra da lista ainda não vista/lida; **exceção: séries recebem aviso de nova temporada em qualquer estado**, inclusive *visto* — *decisão de design*):
   - filme **estreou nos cinemas** no Brasil;
   - obra **entrou em qualquer streaming** no Brasil (não só nos que a pessoa assina);
   - série ganhou **nova temporada** (aviso no anúncio da data e na estreia);
   - livro foi **lançado** ou entrou em **pré-venda**, quando a fonte informar.
4. **Comunidades:** uma comunidade oficial criada automaticamente para cada obra. Membros abrem tópicos e respondem.
5. **Spoilers:** tópicos **e respostas individuais** podem ser marcados como "contém spoiler". Em séries, o tópico indica até qual temporada/episódio vai — **é só um rótulo**, não há controle automático por progresso de episódio (*decisão de design*). Conteúdo com spoiler fica oculto até a pessoa clicar.
6. **Quem pode postar:** qualquer pessoa logada pode abrir tópicos e responder em qualquer comunidade. Adicionar a obra à lista torna a pessoa membro automaticamente (membro = vê a atividade da comunidade no Início) — *decisão de design*.
7. **Moderação (decidido):** a equipe do Lobby modera. Qualquer pessoa pode denunciar um tópico ou resposta; uma tela de administração lista as denúncias e permite apagar o conteúdo e banir o usuário. Um filtro bloqueia, no envio, links de sites piratas conhecidos (lista mantida pela equipe). Moderadores voluntários por comunidade ficam como possibilidade futura, se o Lobby crescer.
8. **PWA** instalável no celular, com avisos pelo navegador (Web Push) e por e-mail.
9. **Nota e resenha (decidido após a análise da concorrência):** ao marcar uma obra como vista/lida, a pessoa pode dar uma nota (estrelas de 0,5 a 5) e escrever uma resenha. **A pessoa escolhe** se a resenha fica só para ela (guardada na lista) ou se é publicada como tópico na comunidade da obra. Ela pode mudar de ideia depois: publicar uma resenha guardada, ou despublicar (o tópico é removido da comunidade, a resenha continua guardada).
10. **Importar do Letterboxd e do Goodreads (decidido):** a pessoa envia o arquivo CSV exportado desses sites, e o Lobby traz a lista com estados, notas e resenhas (resenhas importadas entram como privadas). Obras que não forem encontradas automaticamente aparecem numa lista para a pessoa resolver à mão.

## 3. Fora do escopo agora (não-objetivos)

- Moderadores voluntários por comunidade (avaliar se o Lobby crescer).
- Comunidades criadas por usuários e comunidades temáticas que juntam várias obras (fase 2).
- Horários e salas de cinema, venda de ingressos. Mostramos só "em cartaz" e um link de busca de ingressos.
- Aplicativos nativos nas lojas (Android/iOS).
- Outros países e idiomas: lançamento **só Brasil, só português**.
- Progresso por episódio nas séries (e spoiler automático por episódio), estado "abandonei" e metas de leitura: fase 2, vistos na análise da concorrência.
- Importação do Skoob e do Filmow (não oferecem exportação conhecida).
- Seguidores, feed social, mensagens privadas. Não foram pedidos; podem vir depois.
- Monetização.

## 4. Anti-objetivos (fracasso mesmo se "funcionar")

- **Parecer pirataria:** nenhum link para conteúdo ilegal. "Onde assistir" mostra só serviços oficiais.
- **Spoiler sem aviso** estragando a experiência de quem ainda não viu.
- **Aviso errado ou atrasado:** avisar que algo estreou quando não estreou destrói a confiança. Na dúvida, não avisar.
- **Conta surpresa:** o projeto deve rodar de graça até ter usuários de verdade.

## 5. Restrições

- **Custo:** o mais perto de zero possível. Só planos gratuitos no início.
- **Fontes de dados e suas regras:**
  - **TMDB** (filmes e séries): sinopse em pt-BR, trailers, elenco, datas de lançamento por país (inclusive tipo "cinema" para o Brasil), novas temporadas e "onde assistir" por país. O "onde assistir" vem da **JustWatch** e **exige crédito visível à JustWatch**. O TMDB exige atribuição e **pode exigir acordo para uso comercial**: revisar antes de monetizar.
  - **Google Books** (livros): sinopse, capa, ISBN, data de publicação. Gratuito, com cota diária. **Open Library** como complemento.
  - Não existe fonte gratuita boa de **livros futuros**: os avisos de livros serão menos completos que os de filmes e séries. Aceito como limitação inicial.
- **Não copiar catálogos inteiros:** buscar a obra na API quando alguém procura e guardar uma cópia local (cache). Atualizar só as obras que estão na lista de alguém.
- **Portabilidade:** deve dar para trocar a hospedagem da Vercel pela Cloudflare em cerca de um dia (ver §7).

## 6. Abordagens consideradas

| Abordagem | Prós | Contras |
|---|---|---|
| **A) Next.js + Supabase + Vercel** ✅ escolhida | Postgres combina com dados muito relacionados (obras, listas, comunidades, tópicos); login pronto; tarefas agendadas no Supabase; mais exemplos e documentação | Supabase gratuito pausa após 7 dias sem uso; Vercel Hobby não permite uso comercial (≈US$ 20/mês ou migrar para a Cloudflare) |
| B) Tudo na Cloudflare (Workers + D1 + Cron) | Plano gratuito mais generoso, sem pausa, permite uso comercial | Login montado à mão; Web Push mais trabalhoso; começo mais lento |
| C) Firebase | Login e push prontos | Tarefas agendadas exigem plano pago com cartão; banco NoSQL ruim para fóruns e listas relacionais |

**Escolha:** A, pela velocidade até um produto funcionando, com regras que mantêm a migração para a Cloudflare barata.

## 7. Decisões tomadas sobre o "como"

- **Front-end:** Next.js (App Router) como PWA (manifest + service worker), responsivo, celular primeiro.
- **Back-end:** Supabase para banco Postgres, autenticação (e-mail e Google), Row Level Security, Edge Functions e agendamento (`pg_cron`).
- **Hospedagem:** Vercel, com estas **regras de portabilidade**:
  1. Nenhum recurso exclusivo da Vercel (Vercel Cron, KV, Blob, Edge Config etc.).
  2. Imagens carregadas direto das CDNs do TMDB e do Google Books, sem a otimização de imagens da Vercel.
  3. Sincronização, detecção de lançamentos e envio de avisos ficam no Supabase (funções/banco), não no Next.js.
- **Avisos:** Web Push (VAPID, gratuito) ligado por padrão; e-mail (Resend, plano gratuito ≈100/dia) **opcional e em resumo diário**, nunca um e-mail por aviso, para caber no plano gratuito — *decisão de design*.
- **Identidade de livro:** uma obra = um livro, não uma edição. Agrupar edições/traduções pelo **ID de obra da Open Library**; Google Books entra como fonte de sinopse/capa/edição em pt-BR. Uma comunidade por livro, não por edição — *decisão de design*.
- **Lançamentos no Início:** estreias de cinema no Brasil vêm do *discover* do TMDB (todas, não só da lista). "Novo em streaming" e livros aparecem **só para obras da lista da pessoa**, porque não há fonte gratuita de todas as novidades de streaming no Brasil — *decisão de design*.
- **Tarefa diária:** confere **apenas as obras presentes em alguma lista**:
  - datas de lançamento no Brasil (tipo cinema);
  - "onde assistir" no Brasil;
  - temporadas novas;
  - dados de livros.

  Compara com o último estado salvo e gera eventos (ex.: "entrou na Netflix"), que viram avisos para quem tem a obra na lista. Isso mantém o uso dentro dos limites das APIs.
- **Comunidades:** uma por obra, criada no primeiro acesso à página da obra (ou junto com o cache dela).

## 8. Modelo de dados (esboço)

- `works`: tipo (filme/série/livro), id externo (tmdb_id; para livros, openlibrary_work_id + ISBNs/google_books_ids das edições), título, sinopse, capa, data de lançamento BR, dados extras (JSON), última sincronização.
- `seasons`: para séries (número, data de estreia).
- `availability`: obra × provedor (Netflix, Max, aluguel, loja…), tipo (assinatura/aluguel/compra/cinema), visto pela primeira vez em.
- `profiles`: dados do usuário.
- `list_items`: usuário × obra × estado, nota, texto da resenha, data em que viu/leu, `review_topic_id` (preenchido se a resenha foi publicada).
- `imports`: arquivo importado, origem (Letterboxd/Goodreads), status, itens não encontrados.
- `notification_prefs` e `push_subscriptions`.
- `events`: mudanças detectadas pela tarefa diária.
- `notifications`: aviso entregue por usuário (com deduplicação: o mesmo evento nunca é enviado duas vezes).
- `communities` (1:1 com `works`), `memberships`, `topics` (com flag de spoiler e, em séries, temporada/episódio), `posts` (com flag de spoiler e soft-delete), `reports` (denúncias), papel de admin em `profiles`, `bans`, `blocked_domains`.

## 9. Telas principais

1. **Início:** lançamentos da semana (cinema, streaming, livros) e atividade das comunidades das obras da pessoa.
2. **Busca:** uma busca única para filmes, séries e livros.
3. **Página da obra:** capa, sinopse, trailer, onde assistir/comprar (com crédito JustWatch), botão "adicionar à lista" + sino de aviso, e a comunidade logo abaixo.
4. **Comunidade/tópico:** lista de tópicos, criar tópico, respostas, spoiler oculto.
5. **Minha lista:** filtros por tipo e estado; nota e resenha de cada obra; botão "importar do Letterboxd/Goodreads".
6. **Avisos:** histórico de avisos e preferências.
7. **Admin:** fila de denúncias, apagar conteúdo, banir usuário, gerenciar domínios bloqueados.

## 10. Deixado para quem for construir

- Estrutura de pastas, bibliotecas de UI e estilo visual.
- Formato exato do esquema SQL e das políticas de RLS.
- Estratégia de testes.
- Detalhes do service worker e do cache offline.
- Horário da tarefa diária e lotes de chamadas às APIs.
