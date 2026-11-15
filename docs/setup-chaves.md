# Lobby — Passo a passo das chaves de API

São três serviços, todos gratuitos: **TMDB** (filmes e séries), **Google Books** (livros) e **Supabase** (banco de dados).

**Tudo é feito pelo navegador; nada roda no seu computador.** As chaves ficam guardadas, criptografadas, nos painéis dos serviços:

- **Vercel** (*Environment Variables*): as 5 chaves do site.
- **GitHub Secrets** (*Settings → Secrets and variables → Actions*): só a senha do banco, quando a automação de tabelas existir.

Nenhuma chave entra no código ou no repositório.

> **Nunca cole as chaves no chat, num e-mail ou num arquivo que vá para o GitHub.** Se uma chave vazar, gere outra no próprio serviço e apague a antiga.

---

## 1. TMDB (filmes e séries)

1. Acesse **https://www.themoviedb.org/signup** e crie uma conta. Confirme o e-mail.
2. Entre na conta. Clique no seu avatar (canto superior direito) → **Configurações** (*Settings*).
3. No menu à esquerda, clique em **API**.
4. Clique em **Criar** / *Create* (ou *Request an API Key*) e escolha **Developer**.
5. Aceite os termos de uso.
6. Preencha o formulário:
   - **Tipo de uso:** *Website*.
   - **Nome do aplicativo:** `Lobby`.
   - **URL:** se ainda não tiver um site, use `http://localhost:3000`.
   - **Resumo:** "Rede social para discutir filmes, séries e livros, com listas pessoais e onde assistir no Brasil."
   - **Dados pessoais:** o formulário pede nome e endereço.
7. Envie o formulário. Na mesma página **API** vão aparecer duas chaves:
   - **Chave da API (v3)**, um texto curto. **Não vamos usar esta.**
   - **Token de Leitura da API (v4 auth)**, um texto bem longo que começa com `eyJ`. **É este que você copia.**
8. Ele vai em `TMDB_API_READ_TOKEN`.

> **Uso comercial:** a chave de desenvolvedor é para uso não comercial. Se um dia o Lobby tiver anúncios ou assinatura, fale com o TMDB sobre uma licença comercial antes.

---

## 2. Google Books (livros)

1. Acesse **https://console.cloud.google.com** e entre com sua conta Google.
2. No topo, clique no seletor de projetos → **Novo projeto**. Nome: `lobby`. Clique em **Criar** e selecione o projeto criado.
3. No menu (☰), vá em **APIs e serviços → Biblioteca**.
4. Pesquise **Books API**, clique nela e depois em **Ativar**.
5. No menu, vá em **APIs e serviços → Credenciais**.
6. Clique em **+ Criar credenciais → Chave de API**. A chave aparece numa janela. Copie.
7. **Restrinja a chave** (recomendado):
   - Na lista, clique no nome da chave.
   - Em **Restrições de API**, marque **Restringir chave** e selecione só **Books API**.
   - Clique em **Salvar**.
8. A chave vai em `GOOGLE_BOOKS_API_KEY`.

> **Sem cartão de crédito:** a Books API tem cota gratuita diária. Se o Google pedir para ativar faturamento, você pode recusar.

---

## 3. Supabase (banco de dados)

1. Acesse **https://supabase.com** → **Start your project** e entre com o GitHub.
2. Clique em **New project**:
   - **Name:** `lobby`.
   - **Database Password:** clique em *Generate a password* e **guarde num gerenciador de senhas**. Você vai precisar dela para rodar as migrações do banco.
   - **Region:** **South America (São Paulo)**.
   - **Plan:** Free.
3. Clique em **Create new project** e espere uns 2 minutos.
4. No menu esquerdo, vá em **Project Settings** (engrenagem) → **API Keys** (e **Data API** para a URL). Você vai ver três coisas:
   - **API URL** (algo como `https://abcd1234.supabase.co`) → vai em `NEXT_PUBLIC_SUPABASE_URL`.
   - **Publishable key** (começa com `sb_publishable_`) → vai em `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **Secret keys** (começa com `sb_secret_`; clique no olho para revelar e copie) → vai em `SUPABASE_SERVICE_ROLE_KEY`.

   Em painéis mais antigos, essas chaves aparecem com os nomes **anon / public** (= publishable) e **service_role** (= secret). Funcionam do mesmo jeito.

> **A secret key (antiga `service_role`) é a chave mestra do banco:** ignora todas as regras de segurança. Ela fica só no servidor e nunca pode aparecer no navegador. É por isso que o nome dela não começa com `NEXT_PUBLIC_`.

> **Pausa por inatividade:** no plano gratuito, o projeto pausa depois de 7 dias sem uso. Para reativar, basta clicar em **Restore** no painel.

---

## 4. Onde colocar: Vercel

1. Em **vercel.com**, abra o projeto **spool** → **Environment Variables** (menu esquerdo).
2. Crie as 5 variáveis abaixo, uma por vez (*Key* = nome, *Value* = a chave), marcando **Production** e **Preview**:

| Key | Value |
|---|---|
| `TMDB_API_READ_TOKEN` | Token de Leitura da API (v4) do TMDB, começa com `eyJ` |
| `GOOGLE_BOOKS_API_KEY` | chave do Google Cloud, começa com `AIza` |
| `NEXT_PUBLIC_SUPABASE_URL` | API URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key, começa com `sb_publishable_` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key, começa com `sb_secret_` |

3. A Vercel publica sozinha a cada envio para o GitHub. Se você mudar uma chave depois, vá em **Deployments**, clique nos `⋯` da publicação mais recente e escolha **Redeploy**, para que ela passe a usar a chave nova.

## 5. Criar as tabelas no Supabase

1. No GitHub, abra `supabase/migrations/` e cada arquivo `.sql`, em ordem de nome. Clique em **Copy raw file**.
2. No Supabase, vá em **SQL Editor** → **New query**, cole o conteúdo e clique em **Run**. Deve aparecer *Success*.

## 6. Automação do banco (GitHub Actions)

Com isso, toda mudança de tabela que entrar no `main` é aplicada sozinha no Supabase — você nunca mais cola SQL.

**Cadastre 3 segredos** em **GitHub → repositório spool → Settings → Secrets and variables → Actions → New repository secret**:

| Name | Onde pegar |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase → seu avatar (canto inferior esquerdo) → **Account preferences** → **Access Tokens** → **Generate new token** (nome: `github-lobby`). Copie na hora; ele não aparece de novo. |
| `SUPABASE_DB_PASSWORD` | A senha do banco que você guardou ao criar o projeto. Esqueceu? Supabase → **Project Settings → Database → Reset database password** (e atualize aqui). |
| `SUPABASE_PROJECT_ID` | O código do projeto: é o trecho entre `https://` e `.supabase.co` na sua API URL (ex.: `abcd1234efgh5678ijkl`). |

**Uma única vez, se você já colou o SQL à mão no SQL Editor:**

1. GitHub → aba **Actions** → **Banco de dados** (à esquerda) → botão **Run workflow**.
2. No campo *"Versões que você já rodou à mão"*, escreva `20261115000000` e clique em **Run workflow**.
3. Isso avisa ao Supabase que essa tabela já existe, para a automação não tentar criá-la de novo.

Se você **não** colou o SQL antes, rode o mesmo **Run workflow** com o campo vazio — ele cria as tabelas.

Depois disso, não precisa fazer mais nada: cada etapa nova aplica as próprias mudanças. Se uma execução falhar, a aba **Actions** mostra um ❌ — me mande o print do erro.

## 7. Login (Supabase Auth)

### 7a. Endereços do site (obrigatório)

Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://spool-eta-eight.vercel.app`
- **Redirect URLs** → **Add URL**, uma de cada vez:
  - `https://spool-eta-eight.vercel.app/**`
  - `https://*-lobby-9cae.vercel.app/**` (os links de teste da Vercel)
- **Save**.

### 7b. Entrar com Google (recomendado, gratuito)

1. **Google Cloud** (mesmo projeto `lobby` da Books API) → **APIs e serviços → Tela de consentimento OAuth** (*Google Auth Platform*):
   - Tipo **Externo**, nome do app **Lobby**, seu e-mail de suporte → salvar.
   - Em **Público-alvo**, clique em **Publicar app** (senão só usuários de teste conseguem entrar).
2. **APIs e serviços → Credenciais → + Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**, nome `Lobby`.
   - **URIs de redirecionamento autorizados → + Adicionar URI:** `https://SEU_PROJECT_ID.supabase.co/auth/v1/callback` (o mesmo código do `SUPABASE_PROJECT_ID`).
   - **Criar** → copie o **ID do cliente** e a **Chave secreta do cliente**.
3. **Supabase → Authentication → Sign In / Providers → Google**: ative, cole o **Client ID** e o **Client Secret** → **Save**.
4. **Vercel → Environment Variables**: crie `NEXT_PUBLIC_GOOGLE_LOGIN` = `on` (tipo **Config**, Production e Preview) → **Redeploy**.

### 7c. Entrar por e-mail (limitado por enquanto)

O e-mail embutido do Supabase só entrega para pessoas da sua equipe no Supabase e poucas mensagens por hora. Para abrir para todo mundo é preciso um provedor de e-mail (ex.: Resend) com **um domínio próprio** (ex.: `lobby.com.br`). Fica para quando houver domínio; até lá, o Google é a porta de entrada.

## 8. Virar administrador

1. Entre no Lobby uma vez (com Google) e escolha seu nome de usuário.
2. Supabase → **Table Editor** → tabela **profiles** → ache sua linha (pelo `username`).
3. Clique na célula **is_admin**, troque para **true** → **Save**.
4. Recarregue o Lobby: o link **Admin** aparece no topo. Lá ficam as denúncias e os domínios bloqueados.
