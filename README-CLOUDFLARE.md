# LAG Controller — versão Cloudflare

Esta versão foi reorganizada para **Cloudflare Pages + Pages Functions + D1 + R2**.

## O que mudou

- Login real no backend, com senha protegida por PBKDF2 e sessão em cookie `HttpOnly`.
- Usuários, cargos, cidade vinculada e permissões no D1.
- O seletor “Visualizar sistema como” foi removido.
- A cidade da sessão não pode mais ser trocada no navegador. Ela vem do cadastro do usuário.
- Dados dos módulos que usam `localStorage` são sincronizados automaticamente com o D1 por cidade.
- Currículos de candidatos continuam preparados para o R2.
- Páginas internas são protegidas no middleware antes de o HTML ser entregue.

## Estrutura

- `public/`: site completo.
- `functions/`: autenticação, usuários, sincronização, suporte e candidatos.
- `migrations/`: estrutura do banco D1.
- `wrangler.jsonc`: configuração do projeto.

## 1. Instalar

No terminal, dentro desta pasta:

```bash
npm install
npx wrangler login
```

## 2. Criar o projeto Pages

```bash
npm run project:create
```

Caso o projeto `lag-controller` já exista, pule esta etapa.

## 3. Criar o D1

```bash
npx wrangler d1 create lag-controller-db
```

O comando mostrará um `database_id`. Copie esse UUID e substitua:

```json
"database_id": "00000000-0000-0000-0000-000000000000"
```

no arquivo `wrangler.jsonc`.

Depois execute:

```bash
npm run db:migrate:remote
```

## 4. Criar os buckets R2

```bash
npx wrangler r2 bucket create lag-candidate-files
npx wrangler r2 bucket create lag-partner-files
```

## 5. Configurar a senha inicial

No painel Cloudflare:

1. Abra **Workers & Pages**.
2. Entre no projeto **lag-controller**.
3. Acesse **Settings > Variables and Secrets**.
4. Crie o segredo `INITIAL_ADMIN_PASSWORD`.
5. Digite uma senha forte para o primeiro administrador.

O primeiro acesso será:

- E-mail: `gestor@lagcontroller.com`
- Senha: valor cadastrado em `INITIAL_ADMIN_PASSWORD`

Quando o banco ainda estiver vazio, o primeiro login válido cria automaticamente o administrador no D1.

Para desenvolvimento local, copie `.dev.vars.example` para `.dev.vars` e defina a senha.

## 6. Testar localmente

```bash
npm run db:migrate:local
npm run dev
```

Abra o endereço exibido pelo Wrangler. Não teste abrindo o HTML diretamente, pois o login depende das Pages Functions.

## 7. Publicar

```bash
npm run deploy
```

## Dados existentes do navegador

Na primeira abertura autenticada, o sincronizador procura os registros antigos do `localStorage` e envia ao D1. Depois disso, alterações novas são sincronizadas automaticamente.

## Segurança

- Não coloque senhas no JavaScript nem no GitHub.
- Use somente `INITIAL_ADMIN_PASSWORD` como segredo no Cloudflare.
- Configure Turnstile para o formulário público quando for publicado externamente.
- Para dados médicos reais, revise permissões, retenção, backups e requisitos de LGPD antes da entrada em produção.
