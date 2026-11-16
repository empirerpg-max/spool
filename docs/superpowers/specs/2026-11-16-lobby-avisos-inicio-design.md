# Lobby — Avisos e Início

**Data:** 2026-11-16
**Status:** aprovado (opção A escolhida pelo usuário: só avisos no site/celular; e-mail fica para quando houver domínio)

## Intenção

Fazer o Lobby avisar quando algo da lista da pessoa fica disponível ou é lançado, e dar à tela inicial um motivo para voltar todo dia (spec principal, objetivos 3 e 8; telas 1 e 6).

## O que a pessoa vê

- **Sino no topo** com o número de avisos não lidos; **/avisos** lista os avisos (mais novos primeiro) com link para a obra; abrir a página marca como lidos.
- **Notificação no celular/navegador** (opcional): botão "Ativar avisos no celular" em /avisos. No iPhone, só funciona com o Lobby instalado na tela inicial (o site explica isso).
- **Tipos de aviso** (para obras na lista que ainda não foram vistas/lidas; **temporada nova vale para qualquer estado**):
  - "Matrix estreou nos cinemas" (dia da estreia no Brasil);
  - "Duna: Parte Dois chegou na Max" (entrou em assinatura, grátis ou grátis com anúncios no Brasil);
  - "The Bear: temporada 4 estreia em 25/06" (temporada anunciada com data) e "The Bear: temporada 4 estreou" (no dia);
  - "Torto Arado foi lançado" (data de publicação chegou).
- **Início** (logado): "Novidades da sua lista" (últimos avisos), "Nos cinemas esta semana" (estreias no Brasil, do TMDB) e "Conversas nas suas comunidades" (tópicos recentes das obras da lista). Deslogado: chamada + busca + "Nos cinemas esta semana".

## Decisões (minhas)

- **Tarefa diária** roda pelo GitHub Actions (agendada, gratuita) chamando uma rota protegida do site com um segredo; a rota processa as obras em lotes (cabe no limite de 60 s da Vercel) e o GitHub repete até terminar. Sem Vercel Cron (regra de portabilidade).
- **Só confere obras que estão na lista de alguém**, no máximo uma vez por dia cada.
- **Chaves das notificações (VAPID)** geradas pelo próprio site na primeira vez e guardadas no banco, numa tabela que só o servidor lê. A pessoa dona não precisa criar nem colar nada.
- **Sem aviso repetido:** cada acontecimento tem uma chave única; o mesmo aviso nunca chega duas vezes.
- **Primeira conferência de uma obra não gera "chegou no streaming"** para o que já estava disponível quando ela entrou no Lobby (evita enxurrada de avisos falsos).
- **Avisos com mais de 90 dias** somem da lista.
- Notificações no celular levam ao link da obra.

## Fora do escopo

- E-mail (precisa de domínio).
- Preferências finas por tipo de aviso (só liga/desliga as notificações do celular).
- "Onde assistir" por serviço que a pessoa assina.

## Restrições

- Português e termos leigos; nada de chaves para a pessoa colar.
- Segredo da tarefa: o usuário cria um valor aleatório no GitHub Secrets e na Vercel (`CRON_SECRET`) — é o único passo manual; o guia explica com um gerador de senha.
