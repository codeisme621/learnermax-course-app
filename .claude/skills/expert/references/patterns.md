# Patterns — soft DO/DON'T (judgment, not mechanical)

These need taste; they're not lints (contrast `invariants.md`). Prefer them; deviate
with reason.

## Backend

- **DO follow routes → service → repository per feature.** Routes own HTTP/auth/status;
  services own business logic; repositories own all DynamoDB I/O. A simple feature may
  skip the service (e.g. `feedback` routes call the repository directly) — fine when
  there's no real logic, but add the service the moment logic appears.
  Example: `backend/src/features/courses/{course.routes,course.service,course.repository}.ts`.
- **DO authenticate in the route via `getUserIdFromContext(req)` and 401 on null.**
  Uniform across all protected routes. Public routes must be explicitly `Authorizer: NONE`
  in `template.yaml`. Example: `backend/src/features/progress/progress.routes.ts`.
- **DO validate mutating request bodies with Zod (`schema.parse`) at the boundary**,
  returning 400 on `ZodError`. This is the *preferred* direction — only `students` and
  `feedback` routes do it today; `progress`/`enrollment` still use manual `typeof`
  checks. New mutating routes should use Zod. Example: `feedback.routes.ts` (`createFeedbackSchema`).
- **DO emit structured logs + metrics** — one `createLogger('<ModuleName>')` and
  `createMetrics(...)` per module; never `console.*` (that's a lint).
- **DON'T touch DynamoDB outside a `*.repository.ts`.** Keeps storage swappable and
  marshalling centralized in `lib/dynamodb.ts`.
- **DO use `ConditionExpression` for idempotent writes** (`attribute_not_exists(PK)`)
  and **strip internal keys** (`PK,SK,GSI1PK,GSI1SK,entityType`) before returning a
  domain object from a repository.

## Frontend

- **DO reach the backend the right way for the context:** server actions for mutations,
  `lib/data/*` fetchers for server-component reads, BFF `app/api/*` handlers + SWR for
  client reads. **Client code never calls the backend directly** — it goes through the
  local `/api/*` BFF so the id_token stays server-side.
- **DO source the id_token via `getAuthToken()`** (server-side) and attach it as
  `Authorization: Bearer`. It's the Cognito **ID** token (what API Gateway validates),
  not the access token.
- **DO read the API base URL via `getApiBaseUrl()`** (`lib/env.ts`, throws if unset)
  rather than raw `process.env.NEXT_PUBLIC_API_URL`, to fail fast on misconfig.
- **DO keep server-only secrets/tokens out of client components** — non-`NEXT_PUBLIC_*`
  env and session tokens live only in server actions / route handlers / server components.
- **DO use shadcn primitives from `components/ui` + `cn()`**; put domain components under
  `components/<feature>/` with co-located `__tests__/`.

## Cross-cutting

- **DO test at the cheapest layer that catches the bug.** Unit (mocked AWS / MSW) for
  logic; integration only for real-infra behavior; e2e for the deployed surface.
- **DON'T add a test skip or suppression to get green** — see `invariants.md` backbone.
