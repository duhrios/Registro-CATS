# Continuidade entre contas do Replit

Esta pasta é um registro temporário de continuidade para agentes trabalhando em
contas diferentes. Ela não é importada pelo frontend, pela API ou pelo build.

## Projeto

- Monorepo pnpm em `Registro-Modernozip/Registro-Moderno`.
- Frontend React/Vite em `artifacts/controle-prestadores`.
- API Express em `artifacts/api-server`.
- O projeto usa Supabase real; não criar valores falsos para as variáveis do
  Supabase.
- Workflows oficiais: frontend na porta 5000 e API na porta 8080.

## Trabalho atual

- A causa do erro 413 no cadastro era uma foto Base64 grande demais.
- O navegador agora reduz a foto para JPEG com dimensão máxima de 1024 px e
  aproximadamente 450 KB.
- A API valida formato/tamanho da foto, limita JSON a 2 MB e retorna JSON
  específico para 413, 400, 409 e 500.
- `getUserFacingError` traduz erros de rede/API para mensagens acionáveis.
- Próximo passo desta sessão: instalar dependências, rodar typecheck/build,
  reiniciar os dois workflows e verificar o preview.

## Comandos de validação

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/controle-prestadores run build
pnpm --filter @workspace/api-server run build
```

## Regra de encerramento

Esta pasta é somente um caderno temporário entre contas. Remova-a antes de
entregar o projeto final, conforme pedido do usuário.