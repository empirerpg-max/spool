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

## 7. Contas (e-mail e senha, só com convite)

### 7a. Endereços do site

Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://spool-eta-eight.vercel.app`
- **Redirect URLs** → **Add URL**: `https://spool-eta-eight.vercel.app/**` e `https://*-lobby-9cae.vercel.app/**` → **Save**.

### 7b. Desligar o e-mail de confirmação (por enquanto)

Sem domínio próprio, o Supabase não consegue mandar e-mail para quem é de fora. Como o convite já controla quem entra:

1. Supabase → **Authentication** → **Sign In / Providers** → **Email**.
2. Deixe **Enable Email provider** ligado.
3. **Desligue "Confirm email"** → **Save**.

### 7c. Criar a sua conta (a primeira vira administradora)

1. Abra `https://spool-eta-eight.vercel.app/criar-conta`.
2. Enquanto o Lobby não tem administrador, a tela não pede convite. Preencha seus dados e crie a conta: ela já nasce como **administradora**.
3. Escolha seu nome de usuário (@).
4. O link **Admin** aparece no topo. Em **Admin → Convites**, gere um código para cada pessoa que você quiser chamar.

> Faça isso **antes** de divulgar o endereço do site: quem criar a primeira conta vira administrador. Essa porta abre uma única vez: depois disso, só com convite.

> Contas só podem ser criadas pelo site. Os botões "Add user" e "Invite user" do painel do Supabase não funcionam (o banco recusa contas sem os dados do cadastro).

### 7e. E-mail de contato

Os Termos e a Política de Privacidade precisam de um e-mail para pedidos (exclusão de conta, LGPD, recursos de moderação). Na Vercel, crie a variável `NEXT_PUBLIC_CONTACT_EMAIL` (tipo **Config**, Production e Preview) com esse e-mail e faça **Redeploy**.

### 7d. Esqueceu a senha?

Enquanto o Lobby não envia e-mails, quem esquecer a senha pede para você. Em **Admin → Usuários**, digite o e-mail da pessoa e gere uma senha temporária. A pessoa entra com ela e troca em **Minha conta**.

## 8. Virar administrador (caso precise de outro admin)

1. A pessoa cria a conta normalmente (com convite) e escolhe o @.
2. Supabase → **Table Editor** → tabela **profiles** → linha da pessoa (pelo `username`).
3. Célula **is_admin** → **true** → **Save**.

## 9. Avisos diários (estreias, streaming, temporadas)

Todo dia de manhã o GitHub pede ao site para conferir as obras das listas e criar os avisos. Para isso, os dois precisam combinar uma senha só deles: o `CRON_SECRET`.

1. **Gere uma senha longa** (32 caracteres ou mais, só letras e números) num gerador de senhas — por exemplo, o do seu navegador ou do seu gerenciador de senhas. Não use uma senha que você já usa.
2. **Vercel** → **Environment Variables** → nova variável `CRON_SECRET` (tipo **Secret**, ambiente **Production**) com essa senha → **Save** → **Deployments** → `⋯` → **Redeploy**.
3. **GitHub** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**: nome `CRON_SECRET`, mesma senha → **Add secret**.
4. **Teste:** GitHub → **Actions** → **Avisos diários** → **Run workflow**. Deve terminar com ✅ e "Tudo conferido.".

As **notificações no celular** não precisam de nenhuma chave sua: o site cria as próprias chaves na primeira vez. Cada pessoa ativa em **Avisos → Ativar avisos no celular**. No iPhone, é preciso antes adicionar o Lobby à tela de início.

## 10. Fotos de perfil

Não precisa configurar nada: a pasta onde ficam as fotos de perfil (chamada `avatars`) é criada sozinha pela automação do banco (passo 6), na próxima vez que ela rodar.

**Só se** alguém tentar trocar a foto em **Minha conta** e aparecer a mensagem *"Não foi possível guardar a foto agora. Tente de novo em alguns minutos."* mais de uma vez, crie a pasta à mão:

1. Supabase → menu da esquerda → **Storage** → **New bucket**.
2. Nome: `avatars` (exatamente assim, tudo minúsculo).
3. Ligue a opção **Public bucket** (as fotos de perfil são vistas pelos membros do clube).
4. **Save** (ou **Create bucket**). Não precisa mexer em mais nada.
5. Tente trocar a foto de novo.
