# Procedural — how to add a feature here

The concrete steps, grounded in the actual conventions. Adapt to scope.

## A backend API feature (new resource under `/api/*`)

1. **Create the slice** under `backend/src/features/<feature>/`:
   - `<feature>.types.ts` — request/response + entity shapes.
   - `<feature>.repository.ts` — DynamoDB I/O ONLY. Import `docClient` from
     `../../lib/dynamodb.js`. Build `PK`/`SK` (+ `GSI1`) keys; strip internal keys
     before returning; use `attribute_not_exists(PK)` for create-once writes.
   - `<feature>.service.ts` — business logic (skip only if there's genuinely none).
   - `<feature>.routes.ts` — `express.Router()`; in each protected handler call
     `getUserIdFromContext(req)` → 401 on null; validate the body with a Zod schema
     (`schema.parse`, 400 on `ZodError`); `try/catch` → `logger.error` + status JSON.
     Create one `createLogger('<Feature>')` (+ `createMetrics` if you emit metrics).
2. **Register the router** in `backend/src/app.ts` under `/api/<feature>` (the only
   place routers are mounted).
3. **Infra in `backend/template.yaml`** if needed: new access pattern → confirm the
   GSIs cover it; new route's auth → it inherits the Cognito authorizer by default,
   so add an explicit `Authorizer: NONE` entry only for a genuinely public route; new
   IAM/env → add to the function definition.
4. **Unit tests** in `__tests__/<...>.test.ts` with `aws-sdk-client-mock` for DynamoDB.
   Integration test in `__integration__/*.integration.test.ts` only if real-infra
   behavior matters (it runs against the preview table).

## A frontend feature

1. **Page/route** under `frontend/app/...`; guard protected pages with `auth()` +
   `redirect('/signin?...')` (see `dashboard/page.tsx`).
2. **Data access** — pick the right channel:
   - mutation → server action in `frontend/app/actions/<x>.ts` (FIRST line `'use server'`),
     get the token via `getAuthToken()`, `fetch` `${getApiBaseUrl()}/api/...` with Bearer.
   - server-component read → `frontend/lib/data/<x>.ts` (cache-tag if cacheable).
   - client read → BFF handler in `frontend/app/api/<x>/route.ts` + a client fetcher in
     `lib/fetchers.ts` + an SWR hook in `hooks/use<X>.ts` (client calls the local `/api/*`,
     never the backend directly).
3. **Components** — domain components under `components/<feature>/`, built on
   `components/ui` primitives + `cn()`; co-locate `__tests__/`.
4. **Tests** — unit (jsdom, mocked next-auth/navigation); integration with MSW handlers
   in `app/actions/__integration__/handlers.ts` for full-flow coverage.

## Verifying before you open the PR

- Run `./scripts/local-checks.sh` from repo root (lint, typecheck, fast unit, skip-detection,
  custom lints). Fix with `./scripts/local-checks.sh fix` for the auto-fixable subset.
- Make `./prds/<feature>/run-prd-test.sh` pass — that's the definition of done.
- Run the app via `pnpm run dev:bg` (backend :8080, frontend :3000) and read `dev:logs`;
  for deployed behavior, use the `deploy-preview-*` + `*-logs.sh` signal scripts.
- Respect the invariants in `invariants.md` — the custom lints will catch the enforced ones.

## Gotchas

- Backend is ESM (`"type": "module"`): **relative imports need the `.js` extension**.
- The token on the wire is the Cognito **ID** token, not the access token.
- Integration tests need `backend/.env.integration` and AWS creds; the env-guard refuses
  any table name without `preview`/`test`/`dev`.
- `frontend/proxy.ts` is the Next.js middleware (named `proxy` for Next 16+); it handles
  video-access cookies *and* auth route protection.
