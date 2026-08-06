# Preparação Cloudflare — Candidatos médicos

O projeto continua em **modo local**. A ficha pública salva os dados no `localStorage` e o currículo no `IndexedDB`. Nada foi conectado ao Cloudflare automaticamente.

## Estrutura preparada

- `functions/api/candidatosMedicos/index.js`: cadastro público e listagem gerencial.
- `functions/api/candidatosMedicos/[id].js`: leitura, alteração de status e exclusão.
- `functions/api/candidatosMedicos/[id]/curriculo.js`: visualização segura do currículo.
- `cloudflare/schema-candidatos.sql`: tabelas e índices do D1.
- `cloudflare/wrangler.toml.example`: bindings esperados.
- D1 binding: `DB`.
- R2 binding: `CANDIDATE_FILES`.

## Antes de ativar

1. Criar o banco D1 e executar `cloudflare/schema-candidatos.sql`.
2. Criar o bucket R2 privado `lag-candidate-files`.
3. Adicionar os bindings `DB` e `CANDIDATE_FILES` no projeto Pages.
4. Proteger as páginas internas e `/api/candidatosMedicos*` com Cloudflare Access.
5. Cadastrar no D1 os usuários internos com e-mail, cargo e cidade.
6. Configurar Turnstile na ficha pública e o segredo `TURNSTILE_SECRET`.
7. Configurar políticas de retenção, exclusão e backup dos currículos.
8. Testar upload máximo de 10 MB, tipos PDF/DOC/DOCX e permissões de Gerente/Admin.
9. Só depois alterar `shared/js/lag-api-config.js` de `mode: "local"` para `mode: "cloudflare"`.

## Segurança prevista

- O currículo fica privado no R2.
- O download passa pela API e exige usuário autenticado da equipe.
- A listagem, edição e exclusão exigem cargo `admin`, `administrador` ou `gerente`.
- O envio público pode exigir Turnstile.
- O código não inclui senha ou token secreto no navegador.

## Itens futuros que ainda precisam ser ligados

- autenticação real e sessão do LAG Controller;
- auditoria de quem visualizou, alterou ou excluiu cada candidatura;
- envio de notificação por e-mail/WhatsApp;
- política LGPD, consentimento, prazo de retenção e exclusão;
- backup periódico do D1 e R2;
- domínio definitivo e regras de CORS, caso a API use outro domínio.
