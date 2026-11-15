# Lobby — Passo a passo das chaves de API

São três serviços, todos gratuitos: **TMDB** (filmes e séries), **Google Books** (livros) e **Supabase** (banco de dados).

No fim, as chaves vão para dois lugares:

- **No seu computador:** um arquivo chamado `.env.local`, na pasta do projeto. Esse arquivo **nunca vai para o GitHub**, porque o `.gitignore` já o ignora.
- **No site publicado:** na Vercel, em *Settings → Environment Variables*. Isso só será necessário quando formos publicar.

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

## 4. Onde colocar: o arquivo `.env.local`

1. Na pasta do projeto, copie o arquivo `.env.example` e dê o nome `.env.local` à cópia.
2. Preencha assim (sem aspas e sem espaços):

```
TMDB_API_READ_TOKEN=eyJhbGciOi...seu-token-longo
GOOGLE_BOOKS_API_KEY=AIza...sua-chave
NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

3. Salve o arquivo. Para conferir que ele não vai para o GitHub, rode `git status`: o `.env.local` **não pode aparecer na lista**.
4. Rode `npm run dev` e abra http://localhost:3000.

## 5. Quando publicar na Vercel

Em **vercel.com → seu projeto → Settings → Environment Variables**, crie as mesmas cinco variáveis com os mesmos valores, marcando *Production* e *Preview*. Depois clique em **Redeploy**.
