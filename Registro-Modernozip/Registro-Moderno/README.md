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

Configure as variáveis abaixo em **Secrets** do Replit (ou no ambiente seguro
do deploy). O arquivo `.env.example` é apenas uma referência; não coloque
valores reais em arquivos versionados:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` é usada somente pela API. O frontend recebe apenas
`SUPABASE_URL` e `SUPABASE_ANON_KEY` por meio de `GET /api/config`; nenhuma
credencial de serviço é enviada ao navegador.

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
na porta `8080` durante o desenvolvimento. Durante a inicialização, ele tenta
carregar a configuração algumas vezes para aguardar a API subir; se as Secrets
estiverem ausentes, a API permanece bloqueada e não entra em modo de teste.

## Configurar a pasta do Google Drive

O cadastro atual guarda o link oficial da pasta para que a equipe saiba onde
organizar as fotos. Ele ainda não envia arquivos automaticamente para o Drive.

1. Abra o [Google Drive](https://drive.google.com) com a conta da escola.
2. Crie uma pasta exclusiva para as fotos dos prestadores, por exemplo
   `Fotos de prestadores`.
3. Abra **Compartilhar** e defina quem poderá acessar a pasta. Para uma pasta
   interna, prefira adicionar os e-mails da equipe em vez de usar “qualquer
   pessoa com o link”.
4. Copie o endereço da pasta. Ele deve começar com
   `https://drive.google.com/drive/folders/`.
5. Entre no sistema com uma conta administradora e abra
   **Administração da recepção → Pasta de fotos online**.
6. Cole o endereço e clique em **Salvar link**. Somente administradores podem
   alterar essa configuração.

O link não deve conter senha, chave ou token. A conexão para upload automático
de fotos exigirá uma integração OAuth oficial do Google Drive, que não está
configurada neste projeto.

## Verificações

```bash
pnpm run typecheck
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/controle-prestadores run build
pnpm --filter @workspace/api-server run build
```

## Estado do projeto

A base do projeto usa exclusivamente Supabase real, incluindo autenticação,
rotas protegidas, schema SQL e proxy entre frontend e API. O primeiro acesso
cria o único administrador; os usuários seguintes são criados por ele com
permissões padrão da recepção. A identidade visual global foi ajustada para a
paleta da Educação Adventista.

## Segurança

- A `SUPABASE_SERVICE_ROLE_KEY` deve permanecer exclusivamente no backend.
- Nunca faça commit de secrets, tokens ou arquivos `.env`.
- As rotas de prestadores e visitas exigem um token válido do Supabase.