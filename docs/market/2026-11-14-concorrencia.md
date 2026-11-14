# Lobby — Análise da concorrência

**Data:** 2026-11-14
**Escopo:** Letterboxd, Filmow, Skoob e Goodreads, mais um contexto de séries (TV Time / Serializd), comparados com o Lobby como descrito em `docs/superpowers/specs/2026-11-14-lobby-design.md`.

> Os números de usuários vêm de fontes secundárias (Wikipedia, lojas de apps, blogs) e variam entre si. Use-os como ordem de grandeza, não como dado exato.

## 1. Resumo

- **Ninguém junta os três formatos.** Letterboxd e Filmow cobrem filmes (e séries, em parte); Skoob e Goodreads cobrem livros. Quem consome os dois mundos precisa de duas ou três contas.
- **Discussão em comunidade é fraca em quase todos.** O Letterboxd é centrado em resenhas, não em fóruns. Goodreads e Skoob têm grupos, mas antigos e pouco cuidados. O modelo "cada obra é uma comunidade" do Lobby é um diferencial real.
- **Avisos de lançamento são quase inexistentes** nesses quatro. Rastreadores de séries (Serializd e o finado TV Time) fazem isso, mas só para séries.
- **Janela de oportunidade:** o **TV Time encerrou em 15/07/2026** e apagou os dados dos usuários. Muita gente que acompanhava séries episódio a episódio está procurando uma casa nova.
- **O que todos têm e o Lobby não tem (ainda):** **nota e resenha**. É o hábito central do Letterboxd, do Filmow, do Skoob e do Goodreads.

## 2. Concorrente por concorrente

### Letterboxd (filmes; séries anunciadas)
- **O que é:** a rede social de filmes mais popular do mundo. Passou de **30 milhões de membros** em 2026, com crescimento acelerado (10 milhões novos entre jan/2025 e jan/2026).
- **O que faz bem:** diário de filmes vistos, notas de meia estrela, resenhas curtas e bem-humoradas, listas (públicas, compartilhadas ou privadas), watchlist, design muito cuidado. "Onde assistir" via JustWatch; nos planos pagos (Pro/Patron) dá para filtrar a watchlist pelos seus streamings.
- **Onde é fraco:** séries de TV foram anunciadas, mas a chegada é lenta e dividiu a comunidade. Sem livros. Sem fóruns: a conversa acontece nos comentários das resenhas. Sem avisos de estreia. Os melhores filtros são pagos.
- **Lição para o Lobby:** a estética e o hábito do "registrar e dar nota" são o motor do Letterboxd. Filtro por "meus streamings" é recurso que as pessoas pagam para ter.

### Filmow (filmes e séries, Brasil)
- **O que é:** rede social brasileira de filmes e séries, em português, com mais de **3 milhões de usuários cadastrados** segundo a Wikipedia. Tem app Android relançado em 2026 e catálogo de mais de 40 mil séries.
- **O que faz bem:** catálogo em português, marcações (quero ver, já vi), notas, comentários por obra, listas da comunidade, seções "em cartaz" e "em breve".
- **Onde é fraco:** sem livros. Interface e experiência envelhecidas em relação ao Letterboxd. Comentários por obra, mas não comunidades com tópicos. Avisos limitados.
- **Lição para o Lobby:** é o concorrente mais direto no Brasil para filmes e séries. Mostra que existe público brasileiro que quer isso em português. O Lobby vence se for mais moderno e se a discussão for organizada em tópicos, não num mural de comentários.

### Skoob (livros, Brasil)
- **O que é:** a maior rede de leitores do Brasil. Os números variam de **4 a 10 milhões de usuários** conforme a fonte.
- **O que faz bem:** estante virtual com muitos estados (lido, lendo, abandonado, desejado, relido, para troca, favorito), estante separada para quadrinhos, notas de 0 a 5, resenhas, histórico durante a leitura, metas anuais de leitura, rankings, **grupos de discussão**, recados, recomendações e **troca de livros** (no plano PLUS).
- **Onde é fraco:** sem filmes e séries. App com limitações (ex.: o cadastro de livros só pode ser feito pelo site, segundo um guia). Experiência considerada datada.
- **Lição para o Lobby:** leitores brasileiros gostam de **metas de leitura**, **estados detalhados** (inclusive "abandonado") e do lado social. A troca de livros é um diferencial do Skoob difícil de copiar e que não precisamos copiar.

### Goodreads (livros, global, da Amazon)
- **O que é:** a maior rede de leitores do mundo, da Amazon.
- **O que faz bem:** catálogo gigante, estantes, desafio anual de leitura, grupos. Em 2026 ganhou **meia estrela** e estante **"Não terminei" (DNF)**, recursos pedidos havia anos. Notas do Goodreads passaram a aparecer em algumas páginas da Amazon.
- **Onde é fraco:** interface antiga, recomendações fracas, spam e "review bombing", **mensagens privadas descontinuadas** no início de 2026, desconfiança por ser da Amazon (privacidade e foco em vender). Leitores estão migrando para alternativas como a **StoryGraph** (mais de 5 milhões de cadastros em jan/2026).
- **Lição para o Lobby:** existe insatisfação real com o Goodreads, mas a maior parte do público brasileiro já está no Skoob. "Não ser da Amazon" e "não ter spam" são argumentos que pesam.

### Contexto: séries (TV Time e Serializd)
- **TV Time** (rastreador de séries episódio a episódio, muito popular) **encerrou em 15/07/2026** e apagou os dados dos usuários.
- **Serializd** é o "Letterboxd das séries": notas, resenhas e avisos de novos episódios. Gratuito, com plano opcional.
- **Lição para o Lobby:** acompanhar séries **por episódio** é um hábito forte e órfão agora. O Lobby, como desenhado, só sabe "vendo / visto" por série inteira.

## 3. Comparativo

| | Letterboxd | Filmow | Skoob | Goodreads | **Lobby** |
|---|---|---|---|---|---|
| Filmes | ✅ | ✅ | ❌ | ❌ | ✅ |
| Séries | ⚠️ anunciado, limitado | ✅ | ❌ | ❌ | ✅ |
| Livros | ❌ | ❌ | ✅ | ✅ | ✅ |
| Português / foco Brasil | ⚠️ tradução | ✅ | ✅ | ⚠️ | ✅ |
| Lista pessoal | ✅ | ✅ | ✅ (estados ricos) | ✅ | ✅ (3 estados) |
| Nota e resenha | ✅ (núcleo) | ✅ | ✅ | ✅ | ❌ **fora do escopo hoje** |
| Onde assistir / comprar | ✅ (filtros pagos) | ⚠️ | ⚠️ | ✅ (Amazon) | ✅ (streaming BR + lojas) |
| Avisos de lançamento | ❌ | ⚠️ | ❌ | ⚠️ | ✅ **cinema, streaming, temporada, livro** |
| Discussão | Comentários em resenhas | Comentários por obra | Grupos | Grupos | ✅ **comunidade com tópicos por obra** |
| Proteção de spoiler | ⚠️ | ⚠️ | ⚠️ | ✅ (marcação) | ✅ (tópico e resposta) |
| Progresso por episódio | ❌ | ⚠️ | — | — | ❌ |
| Metas de leitura | — | — | ✅ | ✅ | ❌ |
| Importar dados de outro site | — | — | — | — | ❌ |

✅ tem · ⚠️ parcial ou limitado · ❌ não tem · — não se aplica

## 4. Onde o Lobby pode ser melhor

1. **Uma conta para tudo:** filmes, séries e livros numa lista só, em português, pensada para o Brasil.
2. **Avisos que ninguém dá:** "estreou no cinema", "entrou na Netflix", "nova temporada", "livro em pré-venda", tudo no mesmo lugar e de graça.
3. **Discussão de verdade:** comunidades com tópicos por obra, com spoiler controlado, em vez de comentários soltos.
4. **"Onde assistir" de graça:** o filtro que no Letterboxd é pago.

## 5. Lacunas que podem mudar o design (para decidir)

1. **Nota e resenha.** Todos os quatro concorrentes têm, e é o hábito que faz as pessoas voltarem todo dia. Sem isso, o Lobby pode parecer incompleto para quem vem do Letterboxd ou do Skoob.
2. **Importar do Letterboxd e do Goodreads.** Os dois permitem exportar os dados em CSV. Trazer a lista da pessoa em um clique tira a maior barreira para trocar de rede.
3. **Progresso por episódio nas séries.** É o público órfão do TV Time. Também permitiria esconder spoilers automaticamente com base no episódio em que a pessoa está.
4. **Estados extras e metas de leitura.** "Abandonado" e metas anuais são hábitos fortes de quem vem do Skoob e do Goodreads. São baratos de fazer.

## Fontes

- [Letterboxd — Wikipedia](https://en.wikipedia.org/wiki/Letterboxd)
- [Letterboxd — integração com JustWatch (anúncio)](https://m.facebook.com/letterboxd/photos/-heres-some-good-newsfrom-today-we-have-justwatch-integration-for-film-availabil/2581128005269333/)
- [Limelight vs. JustWatch vs. Letterboxd: the 2026 comparison](https://www.thelimelight.app/limelight-vs-justwatch-vs-letterboxd)
- [Filmow — site](https://filmow.com/) · [Filmow — Wikipedia](https://en.wikipedia.org/wiki/Filmow) · [Filmow — séries](https://filmow.com/series-todos/)
- [Skoob — Wikipedia](https://en.wikipedia.org/wiki/Skoob) · [Tecnoblog — como usar o Skoob](https://tecnoblog.net/responde/como-usar-o-skoob-rede-social-para-leitores/) · [Canaltech — Skoob](https://canaltech.com.br/redes-sociais/saiba-como-usar-o-skoob-rede-social-para-leitores/) · [Skoob — Google Play](https://play.google.com/store/apps/details?id=com.gaudium.skoob&hl=en_US) · [Skoob para autores](https://tomaaiumpoema.com.br/skoob-para-autores-guia-completo-para-usar-a-maior-rede-de-leitores-do-brasil/)
- [Goodreads Review 2026 — Bookwise](https://bookwiseapp.com/blog/goodreads-review-is-it-still-worth-using-in-2026) · [Is Goodreads owned by Amazon? — BookSense](https://booksense.app/blog/is-goodreads-owned-by-amazon) · [The demise of Goodreads — Front Edge Publishing](https://frontedgepublishing.com/the-demise-of-our-beloved-goodreads-flows-from-amazons-neglect-and-limitations/) · [Meia estrela no Goodreads](https://kumacharmers.com/article/goodreads-half-star-ratings-a-long-awaited-feature-or-too-little-too-late) · [The StoryGraph — Wikipedia](https://en.wikipedia.org/wiki/The_StoryGraph)
- [MacRumors — TV Time encerra em 15/07](https://www.macrumors.com/2026/07/02/show-tracking-app-tv-time-shutting-down/) · [AlternativeTo — substitutos do TV Time](https://alternativeto.net/news/2026/7/tv-time-is-shutting-down-its-service-on-july-15-2026-here-are-some-great-replacements/) · [Serializd — App Store](https://apps.apple.com/app/id1581244120)
