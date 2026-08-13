# Registro-Moderno

Sistema moderno de controle de prestadores para escolas: cadastra prestadores com foto pela webcam, localiza seus dados rapidamente e registra entradas com data e hora.

## Run & Operate

- Frontend: `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/controle-prestadores run dev`
- API real: `PORT=8080 pnpm --filter @workspace/api-server run dev`
- API local de demonstração: `PORT=8080 MOCK_SUPABASE=true pnpm --filter @workspace/api-server run dev`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run test:mock-load` — reproducible 1,000-user demo API smoke/load test with cleanup
- `PORT=5000 BASE_PATH=/ pnpm --filter @workspace/controle-prestadores run build` — production frontend build
- `pnpm --filter @workspace/api-server run build` — production API bundle
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Database: execute `supabase/schema.sql` once in the Supabase SQL Editor; this creates the staff profile table and access roles
- Required secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Authentication: the application login uses a username and password; the API maps the username to an internal Supabase Auth account and validates bearer tokens
- Local demo mode: set `MOCK_SUPABASE=true` only for the Replit preview; it uses in-memory fictional users and provider/visit records, with `admin` / `admin123` as the demo login. Disable it and configure Supabase before using real data.

## Stack

- pnpm workspaces, Node.js 20+, TypeScript 5.9
- API: Express 5
- DB: Supabase Postgres via the Supabase JavaScript client
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/controle-prestadores` — React/Vite application and user-facing pages
- `artifacts/api-server` — Express API, authenticated routes, and photo storage
- `lib/api-spec` — OpenAPI source of truth
- `lib/api-zod` and `lib/api-client-react` — generated validation and React Query hooks
- `artifacts/controle-prestadores/src/index.css` — theme tokens and global styles

## Architecture decisions

- Supabase Auth protects both the browser experience and API routes; unauthenticated users cannot access provider or visit records.
- The first account is created as the initial administrator from the "Primeiro acesso" screen. Administrators can access `/admin`, create users with either the `admin` or `user` role, and edit each user's display name, password, and role. The current administrator cannot remove their own administrator role.
- The frontend uses relative `/api` routes so a reverse proxy can connect it to the API service.
- Provider photos are persisted as validated image data in Supabase Postgres.

## Product

Authenticated staff can register service providers, capture or replace their photo, search the provider directory, view provider details, record arrivals, and review visit history and dashboard summaries.

## User preferences

Interface copy is in Brazilian Portuguese.

## Gotchas

- Vite requires both `PORT` and `BASE_PATH`.
- The API workflow uses port 8080 and must run alongside the frontend for data requests.
- Never commit Supabase keys; configure them through the environment's secret store.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
