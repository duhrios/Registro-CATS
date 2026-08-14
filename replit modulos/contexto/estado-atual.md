# Estado atual da continuidade

Este registro é um resumo não sensível para outra conta do Replit retomar o
trabalho. Os valores dos secrets ficam somente no gerenciador de Secrets do
Replit e nunca devem ser copiados para o Git.

## Aplicativo

- Monorepo pnpm/TypeScript com frontend `@workspace/controle-prestadores` e
  API `@workspace/api-server`.
- O aplicativo não depende da pasta `replit modulos`; ela é apenas material de
  continuidade e deve ser removida antes da entrega final, conforme combinado.

## Correção registrada

- O problema original era o cadastro de prestador enviar uma foto Base64 maior
  que o limite do parser JSON, causando HTTP 413.
- A correção já está no código: compressão/redimensionamento no navegador,
  tratamento do limite no backend e mensagens de erro orientadas para o
  usuário.
- Typecheck e build completo passaram usando as variáveis de execução
  `PORT=5000` e `BASE_PATH=/`.

## Execução no Replit

- Frontend: `Controle de Prestadores`
  - Comando: `cd Registro-Modernozip/Registro-Moderno && PORT=5000 BASE_PATH=/ pnpm --filter @workspace/controle-prestadores run dev`
  - Porta: `5000`
- API: `API Server`
  - Comando: `cd Registro-Modernozip/Registro-Moderno && PORT=8080 pnpm --filter @workspace/api-server run dev`
  - Porta: `8080`
- Verificação sem autenticação: `/api/healthz` deve responder `{"status":"ok"}`.

## Secrets necessários

Os nomes abaixo são necessários para a API iniciar:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Não registrar valores, URLs completas, tokens ou chaves neste arquivo.

## Dependências e validação

- Instalar com `pnpm install --frozen-lockfile` na raiz
  `Registro-Modernozip/Registro-Moderno`.
- O build geral exige `PORT` e `BASE_PATH` por causa das configurações Vite:
  `PORT=5000 BASE_PATH=/ pnpm run build`.
- A API pode exibir um aviso sobre Node 20 e Supabase; isso é aviso de
  compatibilidade, não impede a inicialização atual.

## Reset de acesso

- As contas de autenticação antigas foram removidas após confirmação do
  proprietário.
- Não há perfis restantes em `staff_profiles`.
- `/api/auth/bootstrap/status` retorna `available: true`.
- O primeiro cadastro pelo botão **Criar administrador** cria o perfil com
  `role = admin`; os próximos usuários devem ser criados por um administrador.