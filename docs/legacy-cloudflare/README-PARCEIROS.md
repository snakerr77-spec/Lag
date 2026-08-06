# Preparação futura — Parceiros, planilhas e procedimentos

O módulo continua em modo local nesta versão:

- parceiros, pastas, procedimentos e metadados ficam no `localStorage`;
- contratos, planilhas e documentos ficam no `IndexedDB` do navegador;
- planilhas são lidas no navegador com SheetJS;
- nenhuma API do Cloudflare está ativada.

## Estrutura prevista para a migração

- D1 binding: `DB`;
- R2 binding sugerido: `PARTNER_FILES`;
- schema: `cloudflare/schema-parceiros.sql`;
- bucket privado sugerido: `lag-partner-files`;
- prefixo de arquivos no R2: `parceiros/<cidade>/<parceiro>/<pasta>/<uuid>-arquivo.ext`.

## Rotas que ainda deverão ser implementadas

- `GET/POST /api/parceiros`;
- `GET/PATCH/DELETE /api/parceiros/:id`;
- `GET/POST /api/parceiros/pastas`;
- `DELETE /api/parceiros/pastas/:id`;
- `GET/POST /api/parceiros/procedimentos`;
- `PATCH/DELETE /api/parceiros/procedimentos/:id`;
- `POST /api/parceiros/arquivos`;
- `GET/DELETE /api/parceiros/arquivos/:id`.

## Regras de segurança para a fase Cloudflare

- arquivos privados no R2;
- download sempre pela API com validação de cargo e cidade;
- Admin/Gerente/Gestor podem gerenciar pastas e parceiros;
- Financeiro pode visualizar e atualizar valores e pagamentos;
- auditoria de criação, edição, download e exclusão;
- limite de tamanho e validação de extensão/MIME;
- planilhas devem ser analisadas no backend antes de gravar linhas no D1;
- política de retenção, backup e exclusão conforme LGPD.
