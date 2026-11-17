# Lobby — Navegação nova, Explorar (catálogo) e busca de pessoas

**Data:** 2026-11-17
**Status:** aprovado

## 1. Intenção e o porquê

O Lobby é "uma rede social de **incentivo** a assistir e ler" (usuário). Hoje faltam dois caminhos de descoberta:

- **Catálogo:** só existem lançamentos recentes e próximos. Para achar qualquer outra obra é preciso saber o nome. O usuário quer que o Lobby "seja um catálogo", servindo tanto para "sexta à noite, quero algo para assistir" quanto para "terminei um livro, quero outro parecido".
- **Pessoas:** não dá para procurar ninguém nem chegar ao perfil de alguém sem um link.

Além disso, o topo acumulou links e, no celular, Publicar, Meu perfil, Minha conta e Admin ficam inacessíveis.

## 2. Abordagens consideradas

| | Caminho | Ganho | Custo |
|---|---|---|---|
| **A ✅ escolhido** | Barra fixa embaixo no celular (Início, Explorar, +, Avisos, Perfil); no computador os mesmos itens no topo. "Explorar" junta catálogo e busca de obras e pessoas | Cara de app social; tudo ao alcance do polegar; descoberta e registro no centro | Muda a navegação inteira de uma vez |
| B | Manter o topo + menu "☰" com tudo + página Explorar | Muda menos | Esconde coisas; não parece rede social |
| C | Links "Catálogo" e "Pessoas" separados no topo | Simples | Topo ainda mais cheio (o problema de hoje) |

Decisão do usuário: **A** — "barra embaixo para celular é melhor, para o desktop pode ser em cima".

## 3. O que será construído

### 3.1 Navegação

**Celular (até ~768 px), membro logado** — barra fixa embaixo, 5 botões com ícone + rótulo curto:

```
┌──────────────────────────────────────────┐
│  ⌂        ⌕         ⊕        🔔•3     ◯   │
│ Início  Explorar  Criar   Avisos   Perfil │
└──────────────────────────────────────────┘
```

- **Início** → `/` (lançamentos + timeline, já existe).
- **Explorar** → `/explorar` (seção 3.2).
- **Criar (+)** → abre uma folha curta de baixo para cima com duas opções: **"Publicar sobre uma obra"** (→ `/publicar`) e **"Adicionar à minha lista"** (→ `/explorar` com o campo de busca já focado). *Minha decisão:* mantém o "+" como atalho de registro sem criar uma tela nova.
- **Avisos** → `/avisos`, com o número de não lidos (como o sino de hoje).
- **Perfil** → `/@meu-usuario` (foto pequena no lugar do ícone quando houver). Quem ainda não escolheu @ vai para `/bem-vindo`.
- O topo no celular fica só com o **logo** (e nada mais), liberando espaço. A barra respeita a área segura do iPhone (PWA instalado).
- Item ativo destacado; a barra some em telas de digitação longa? **Não** (*minha decisão*: simples e previsível; o teclado do celular já cobre a barra).

**Computador** — topo: logo · Início · Explorar · Avisos (sino com número) · botão **"+ Criar"** (mesmo menu de duas opções) · foto do perfil abrindo menu: **Meu perfil, Minha lista, Minha conta, Admin (só admin), Sair**.

**Visitante (sem login)** — celular: barra com **Início, Explorar, Entrar**; computador: logo · Início · Explorar · Entrar.

**Onde vão os links que saem do topo** (*minhas decisões*):
- **Minha lista**: aba "Lista" do próprio perfil (para o dono, a lista completa com estrelas, como `/minha-lista` hoje; para os outros, continua só obras + estado e só se for pública) + item no menu da foto no computador. `/minha-lista` continua existindo (importação, filtros).
- **Minha conta, Admin, Sair**: no próprio perfil, botão de engrenagem "Configurações" (celular) e no menu da foto (computador).
- **Timeline**: fica no Início; `/timeline` continua como "ver tudo".
- **Busca**: dentro de Explorar (o campo do topo atual sai).

### 3.2 Explorar (`/explorar`)

Aberto a todos (como a busca e as páginas de obra hoje); a parte de **Pessoas** só para membros.

```
┌────────────────────────────────────┐
│ [ Buscar filmes, séries, livros, pessoas ] │
│ ( Filmes ) ( Séries ) ( Livros )   │
│                                    │
│ Em alta esta semana        Ver mais→│
│ [▯][▯][▯][▯][▯] →                   │
│ Mais bem avaliados          Ver mais→│
│ [▯][▯][▯][▯][▯] →                   │
│ No seu streaming                    │
│ (Netflix)(Prime)(Max)(Disney+)(Globoplay)… │
│ Por gênero                          │
│ (Ação)(Comédia)(Drama)(Terror)…     │
│ Populares no Lobby                  │
│ [▯][▯][▯] →                         │
│ Pessoas para seguir (membros)       │
└────────────────────────────────────┘
```

**Busca** — um campo só; o resultado tem abas **Obras** e **Pessoas** (como Instagram/Letterboxd). Obras = busca atual. Pessoas = membros por @ ou nome no perfil, com botão Seguir; visitante vê "Entre para encontrar pessoas".

**Abas Filmes / Séries / Livros** (filmes é a aba inicial; a escolha fica no endereço, ex. `/explorar?tipo=series`, para poder compartilhar).

**Prateleiras de filmes e séries** (dados do TMDB, na hora, guardados por algumas horas só para exibir — mesma regra das fileiras de lançamentos; nada vai para o banco):
- **Em alta esta semana** — TMDB "trending" da semana.
- **Mais bem avaliados** — TMDB "top rated" (mínimo de votos alto, para evitar distorção).
- **No seu streaming** — botões dos serviços mais comuns no Brasil (Netflix, Prime Video, Max, Disney+, Globoplay, Apple TV+, Paramount+); cada um abre a página "ver mais" filtrada pelo que está no catálogo daquele serviço **no Brasil**.
- **Por gênero** — botões com os gêneros do TMDB em português; cada um abre "ver mais" filtrado.
- **Populares no Lobby** — obras que mais **membros diferentes** adicionaram às listas nos últimos 30 dias (vem do banco do Lobby). *Minhas decisões, por privacidade:* conta listas privadas também, mas só como total; uma obra só entra se **pelo menos 3 membros** a adicionaram (ninguém descobre a lista de uma pessoa); a prateleira aparece só para **membros** e só com pelo menos 3 obras. Contar membros diferentes faz uma importação grande de uma pessoa valer 1, não centenas.

**Prateleiras de livros** (Open Library; sem cota diária):
- **Em alta** — ficção em português publicada recentemente, mais lida no Open Library (a mesma fonte da fileira de livros do Início). *Minha decisão:* o "trending" mundial do Open Library é quase todo em inglês.
- **Por assunto** — botões (Romance, Fantasia, Ficção científica, Mistério e suspense, Terror, Clássicos, Literatura brasileira, Não ficção, Biografias, Infantojuvenil); cada um abre "ver mais".
- **Populares no Lobby** — como acima, só livros.
- (Livros não têm "mais bem avaliados" nem "streaming".)

**Páginas "ver mais"** (`/explorar/...`): grade de capas com "Carregar mais"; os filtros de streaming e gênero podem ser combinados com a ordem (Populares / Mais bem avaliados / Mais recentes) — *minha decisão*, cobre "sexta à noite" ("terror no Netflix, bem avaliado"). Livros têm só Populares e Mais bem avaliados (no Open Library, "mais recentes" traz quase só obras sem capa).

**Cada capa** leva à página da obra (onde já existem lista, onde assistir, notas, comunidade). Selo pequeno com o serviço de streaming não entra agora (custaria uma consulta por obra).

**Pessoas para seguir** — usa a sugestão que a Timeline já tem (membros ativos que você não segue), também mostrada na aba Pessoas quando a busca está vazia.

### 3.3 Busca de pessoas (banco)
- Função no banco para membros: procura por @ (começo do nome) e por nome no perfil (contém), ignorando acentos e maiúsculas; exclui quem bloqueou ou foi bloqueado e contas banidas; até 20 resultados, quem você segue primeiro.
- Nunca procura nem mostra nome/sobrenome do cadastro (privados).

### 3.4 Detalhes resolvidos por quem escreveu (*minhas decisões*)
- A página de busca atual (`/busca`) passa a abrir o Explorar com o termo buscado.
- As abas Filmes / Séries / Livros também filtram a aba Obras da busca.
- Pessoas silenciadas aparecem na busca de pessoas (silenciar só tira da timeline e dos avisos); bloqueadas não.
- "Minha lista" no menu da foto (computador) leva a `/minha-lista`, que tem importação e filtros.

## 4. Fora do escopo
- Redesenho visual das telas (cores, tipografia, cartões) — fica para depois; esta etapa muda **onde as coisas estão e como se chega nelas**.
- "Parecidos com…" na página da obra e recomendações personalizadas (pode vir depois, usando o TMDB "recommendations").
- Listas temáticas criadas por membros ("Melhores terrores dos anos 80").
- Selo de streaming em cada capa.
- Filtro por década/ano.

## 5. Anti-objetivos
- Copiar catálogos para o banco (continua proibido; tudo montado na hora e guardado só por algumas horas).
- Esconder ações importantes em menus no celular (tudo que existe tem que ser alcançável em até 2 toques a partir da barra).
- Mostrar dados pessoais do cadastro na busca de pessoas.
- Tela vazia: toda prateleira que falhar some sozinha; Explorar nunca quebra inteiro.

## 6. Restrições
- Mesmo visual "Saguão"; português e termos leigos.
- Portabilidade (sem recursos exclusivos da Vercel); cache com o mecanismo padrão do Next.
- Limites gratuitos: TMDB folgado; Google Books não é usado aqui; Open Library sem chave.
- Acessibilidade: barra com rótulos visíveis, área de toque ≥ 44 px, item ativo indicado também por texto para leitores de tela.

## 7. O que fica para quem constrói
- Ícones exatos e animação da folha do "+".
- Quantas capas por prateleira e tamanho das capas.
- Lista exata de gêneros e códigos dos serviços de streaming no TMDB.
- Ajustes nas páginas que hoje dependem do topo (ex.: espaço no fim da página para a barra não cobrir conteúdo).
