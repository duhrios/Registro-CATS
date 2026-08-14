# Registro-Moderno

Sistema de controle de prestadores para a recepção do Colégio Adventista do
Taboão da Serra, com cadastro de pessoas, registro de entradas e consulta do
histórico de visitas. A interface usa uma paleta inspirada na Educação
Adventista, com azul institucional, branco e detalhes dourados.

## Funcionalidades

- Autenticação da equipe da recepção pela Supabase Auth.
- Cadastro de prestadores com nome, empresa, serviço e foto.
- Captura e substituição de foto pela webcam.
- Busca rápida no diretório de prestadores.
- Registro de chegada com data e hora.
- Consulta de detalhes, histórico e indicadores do atendimento.

## Stack

- React, Vite e TypeScript no frontend.
- Express 5 e TypeScript na API.
- Supabase Auth, Postgres e armazenamento dos dados.
- pnpm workspaces para organizar o monorepo.
- Zod e OpenAPI para validação e contrato da API.

## Estrutura

```text
artifacts/
├── controle-prestadores/  # Aplicação web React/Vite
└── api-server/            # API Express e autenticação
lib/
├── api-spec/              # Especificação OpenAPI
├── api-zod/               # Schemas gerados
└── api-client-react/      # Hooks React Query gerados
supabase/
└── schema.sql             # Schema inicial do banco
```

## Requisitos

- Node.js 20 ou superior.
- pnpm.
- Um projeto Supabase.

## Configuração

Configure as variáveis abaixo no ambiente de execução. Não coloque chaves em
arquivos versionados:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Execute `supabase/schema.sql` uma vez no SQL Editor do projeto Supabase antes
de usar o sistema.

## Desenvolvimento

Instale as dependências na raiz do monorepo:

```bash
pnpm install
```

Em um terminal, inicie a API:

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Em outro terminal, inicie a aplicação web:

```bash
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/controle-prestadores run dev
```

O frontend usa as rotas relativas `/api` e encaminha as requisições para a API
na porta `8080` durante o desenvolvimento.

## Verificações

```bash
pnpm run typecheck
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/controle-prestadores run build
pnpm --filter @workspace/api-server run build
```

## Estado do projeto

A base do projeto já está preparada para Supabase, incluindo autenticação,
rotas protegidas, schema SQL e proxy entre frontend e API. O primeiro acesso
cria o único administrador; os usuários seguintes são criados por ele com
permissões padrão da recepção. A identidade visual global foi ajustada para a
paleta da Educação Adventista.

Nesta atualização, os comandos de execução não foram iniciados no ambiente de
desenvolvimento; as verificações acima ficam disponíveis para execução local ou
em CI.

## Segurança

- A `SUPABASE_SERVICE_ROLE_KEY` deve permanecer exclusivamente no backend.
- Nunca faça commit de secrets, tokens ou arquivos `.env`.
- As rotas de prestadores e visitas exigem um token válido do Supabase.
