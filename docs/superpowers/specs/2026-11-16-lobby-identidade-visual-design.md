# Lobby — Identidade visual "Saguão"

**Data:** 2026-11-16
**Status:** aprovado (direção B escolhida pelo usuário em `https://claude.ai/artifact/3QUnQxuh1y8TBbP7NZCQNT`)

## Intenção

O Lobby é o saguão onde as pessoas se encontram antes e depois da sessão (ou da leitura). O visual tem que dizer "rede social de conversa sobre obras", não "catálogo". Hoje o site é neutro e parece protótipo; a ordem da página de obra esconde o diferencial (comunidade e onde assistir).

## Decisões (do usuário)

- Direção **B · Saguão**: fundo ameixa escuro; uma cor por tipo de obra — **coral para filmes, lilás para séries, verde-menta para livros**; comunidade em primeiro plano na página da obra.

## Decisões (minhas, para revisar)

- **Só tema escuro** nesta versão (a direção é escura por natureza; tema claro fica para depois).
- **Paleta** (tokens): fundo `#17121f`, superfície `#1f1829`, superfície 2 `#2a2136`, linha `#3a2f4c`, texto `#f3eefb`, texto suave `#b3a9c6`, filme `#ff7a59`, série `#8f7bff`, livro `#3fd0a2`, perigo `#ff6b6b`, aviso `#f0b04a`, sucesso `#5cd68f`. Botão principal: fundo claro (texto) sobre o escuro.
- **Tipografia**: Bricolage Grotesque nos títulos, Figtree no texto, servidas pelo próprio site (pacotes `@fontsource`, sem depender do Google Fonts no build).
- **Logo**: "Lobby" + três pontinhos nas três cores.
- **Cabeçalho**: logo, busca (campo no computador, ícone no celular) e menu da pessoa.
- **Página da obra**:
  - topo com a imagem de fundo do TMDB (`backdrop`) se dissolvendo no fundo; livros usam a própria capa desfocada;
  - pôster sobreposto ao topo; etiqueta do tipo (Filme / Série / Livro) na cor do tipo; título, ano, título original;
  - linha "N tópicos" na cor do tipo, levando à comunidade;
  - botões da lista logo abaixo do título;
  - navegação de seções "Comunidade · Sobre · Onde assistir" fixa no topo ao rolar (links de âncora, sem JavaScript);
  - ordem: Comunidade → Sobre (sinopse, elenco/autoria, temporadas, trailer) → Onde assistir; no computador, "Onde assistir" e o trailer vão para uma coluna lateral;
  - trailer vira miniatura com "▶ Trailer" que só carrega o vídeo ao tocar.
- **Cor do tipo em todo lugar**: etiqueta/ponto na busca, borda inferior dos pôsteres em "Minha lista", destaque na página do tópico.
- **Demais telas** (início, busca, Minha lista, tópico, novo tópico, entrar, bem-vindo, importar, admin) trocam as cores neutras pelos tokens, sem mudar comportamento.

## Fora do escopo

- Média de notas da comunidade e histograma (precisa de uma consulta nova; fica para a etapa de avisos/início).
- Tema claro.
- Tela inicial com conteúdo (vem na etapa de avisos e Início).

## Restrições

- Nenhuma regra de negócio muda; todos os testes existentes continuam valendo (exceto o do trailer, que passa a carregar no clique).
- Portabilidade: fontes e imagens sem recursos exclusivos da Vercel.
- Acessibilidade: contraste AA do texto sobre o fundo; foco visível; cor do tipo nunca é a única pista (sempre acompanha o nome "Filme/Série/Livro").
