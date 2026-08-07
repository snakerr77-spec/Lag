# LAG Controller — Cloudflare

Projeto preparado para Cloudflare Pages + Pages Functions + D1 + R2.

## Estrutura principal

- `public/`: frontend publicado pelo Pages.
- `functions/`: backend/API do Pages Functions.
- `migrations/`: estrutura do D1.
- `wrangler.jsonc`: bindings de infraestrutura; não contém login nem senha.
- `package.json`: comandos de desenvolvimento/deploy.

## Cloudflare Pages

Configuração de build:

- Framework preset: Nenhum
- Build command: `exit 0`
- Build output directory: `public`
- Root directory: vazio (raiz do repositório)

## Bindings

O `wrangler.jsonc` define:

- `DB` -> D1 `lag-controller-db`
- `CANDIDATE_FILES` -> R2 `lag-candidate-files`
- `PARTNER_FILES` -> R2 `lag-partner-files`

## Secrets / variáveis no painel da Cloudflare

Cadastre em Production, fora do GitHub:

- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD` (Secret)
- `INITIAL_ADMIN_NAME`
- `INITIAL_ADMIN_CITY`

O login possui recuperação segura do administrador inicial: se o e-mail do admin já existir no D1 mas o hash tiver sido criado incorretamente durante a implantação, informar exatamente o `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` configurados na Cloudflare recria o hash PBKDF2 desse admin.

## D1

Aplicar migrations remotamente:

```bash
npm install
npx wrangler login
npm run db:migrate:remote
```

O backend também valida/cria as tabelas centrais de autenticação (`users`, `sessions`, `app_state`, `audit_logs`) quando necessário, evitando erro 500 por tabela central ausente. As migrations continuam sendo a fonte oficial do esquema.

## Diagnóstico

Após o deploy, abra:

`/api/health`

Resposta esperada:

```json
{
  "ok": true,
  "d1": true,
  "candidateFiles": true,
  "partnerFiles": true
}
```

O endpoint não retorna senha, e-mail, hash, salt ou conteúdo do banco.
