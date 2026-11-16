# Lobby — Contas com e-mail e senha, só com convite

**Data:** 2026-11-16
**Status:** aprovado (respostas do usuário na conversa de 16/11)

## Intenção

Hoje ninguém consegue entrar: o login por link no e-mail só entrega para a equipe do Supabase e o Google não foi configurado. O usuário quer contas próprias do Lobby (e-mail e senha) e, neste primeiro momento, cadastro fechado: só entra quem tem convite.

## Decisões do usuário

- **Entrar:** e-mail e senha; só quem já tem conta.
- **Criar conta:** nome, sobrenome, data de nascimento, e-mail, senha, confirmar senha, aceite dos Termos de Uso (obrigatório).
- **Só com convite** neste primeiro momento (formato definitivo do convite será decidido depois).
- **Idade mínima: 16 anos.**
- Aceitou as propostas: código de convite gerado pelo Admin e de uso único; tirar "Entrar com Google" por enquanto; desligar a confirmação por e-mail no Supabase até haver domínio próprio; troca de senha feita pelo Admin enquanto não há e-mail; Termos de Uso e Política de Privacidade escritos por nós como ponto de partida (precisam de revisão jurídica).

## Decisões minhas (para revisar)

- **Primeira conta sem convite:** enquanto o Lobby não tem nenhuma conta, a primeira pode ser criada sem código e já nasce administradora. A partir da segunda, convite obrigatório.
- **Nome de usuário (@)** continua sendo escolhido logo depois de criar a conta (tela "Bem-vindo"), como hoje.
- **Senha:** mínimo 8 caracteres, com pelo menos uma letra e um número.
- **Código de convite:** 8 caracteres, letras maiúsculas e números sem os ambíguos (sem 0/O, 1/I/L); o Admin pode anotar para quem é.
- **As regras valem no banco de dados**, não só na tela: sem convite válido, com menos de 16 anos ou sem aceite dos termos, a conta não é criada nem por quem tentar burlar o site.
- **Termos guardados com versão e data do aceite** (`2026-11-16`), para provar o consentimento (LGPD).
- **Esqueci a senha:** mostra "Peça para a equipe do Lobby redefinir sua senha" até haver domínio; o Admin define uma senha temporária pela área de administração.
- **Sair do login por link e do Google**: as telas deixam de oferecer; o código do Google fica fora.

## Fora do escopo

- Envio de convite por e-mail, convites por usuário, limite de convites por pessoa (formato definitivo virá depois).
- Recuperação de senha por e-mail (depende de domínio).
- Login social.

## Restrições

- Português do Brasil e termos leigos em todas as telas.
- Dados pessoais (nome, sobrenome, nascimento) não aparecem publicamente; o público vê só o @.
