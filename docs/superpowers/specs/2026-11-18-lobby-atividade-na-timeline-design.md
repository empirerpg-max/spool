# Lobby — Atividade da lista na timeline (B + C)

**Data:** 2026-11-18
**Status:** aprovado

## Intenção
"Micael registrou e eu não consigo ver, mesmo seguindo ele" (usuário). O Lobby é um clube de **incentivo**: ver o que os amigos viram, estão vendo e querem ver é o que puxa a pessoa a ver também. Hoje a timeline só mostra publicações, resenhas publicadas e respostas; o que se registra na lista (privada por padrão) fica invisível.

## Abordagens
| | Caminho | Ganho | Custo |
|---|---|---|---|
| A | Mostrar atividade só de quem tem lista pública | Simples, nada muda na privacidade | Quase ninguém ativa; timeline segue vazia |
| **B ✅** | Opção própria "Mostrar minha atividade para quem me segue" (+ "Mostrar minhas notas") | Timeline viva; ninguém muda de privacidade sem escolher | Aviso + opção para construir |
| **C ✅** | Ao marcar Visto/Lido, oferecer "Contar para o clube?" → publicação | Explícito, incentiva publicar | Depende de aceitar a cada vez |

Escolha do usuário: **B + C**.

## O que será construído

**Opções (B)** — em Minha conta → Perfil:
- **"Mostrar minha atividade para quem me segue"** — quem te segue vê quando você marca algo como Quero ver/ler, Vendo/Lendo ou Visto/Lido.
- **"Mostrar minhas notas junto"** — só vale com a primeira ligada; padrão **desligado**.
- **Quem entra agora:** a primeira opção aparece na tela de escolher o @ (`/bem-vindo`) já marcada, com a explicação — a pessoa pode desmarcar ali. *(minha decisão)*
- **Quem já tem conta:** até responder, conta como **desligado**; aparece **uma vez** um aviso no Início e na Timeline: "Mostrar sua atividade para quem te segue? Assim seus amigos veem o que você viu e quer ver." [Sim, mostrar] [Agora não]. "Agora não" não pergunta de novo (dá para mudar em Minha conta). *(minha decisão)*

**Na timeline (B)** — novo tipo de item, para quem você segue e permitiu:
```
(foto) Micael viu  [capa] Duna: Parte Dois  ★★★★½   · há 2 h
(foto) Micael quer ver  [capa] Ainda Estou Aqui     · ontem
(foto) Micael está lendo  [capa] Torto Arado        · 3 d
```
- Verbo conforme o tipo da obra (viu / leu; quer ver / quer ler; está vendo / está lendo).
- Estrelas só se a pessoa ligou "Mostrar minhas notas" e deu nota.
- Um item por mudança de estado (quando muda de "Quero ver" para "Visto", aparece o novo; o antigo continua no histórico).
- **Importações (Letterboxd/Goodreads) não entram** — evita centenas de itens de uma vez. *(minha decisão)*
- Respeita bloqueio e silenciar como o resto da timeline. Resenha e comentário continuam privados (só a resenha publicada aparece, como hoje).

**Na hora de marcar (C)** — ao marcar **Visto/Lido** numa obra, aparece logo abaixo: "Contar para o clube?" [Publicar sobre esta obra] → abre o Publicar já com a obra escolhida. Some se a pessoa ignorar. Para quem está banido ou sem @, não aparece.

## Fora do escopo
- Curtir/responder itens de atividade (só publicações têm isso).
- Avisos no sino por atividade de quem você segue.
- Mostrar a atividade no perfil público (pode vir depois).

## Anti-objetivos
- Mostrar a atividade de alguém que não escolheu mostrar.
- Inundar a timeline com importações.
- Mostrar notas sem permissão explícita.

## Restrições
Regras de privacidade no banco (como o resto do Lobby); português e termos leigos; visual Saguão.
