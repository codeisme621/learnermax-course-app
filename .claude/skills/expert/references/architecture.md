# Architecture — the shape and the why

Distilled from committed code + `architecture-compact.md` / `architecture.md` at repo
root (read those for the full diagrams). This shard is the map; cite `core-files.md`
for exact paths.

## System shape

```
Browser ──HTTPS──> Next.js 15 App Router (Vercel) ──HTTP (Bearer id_token)──>
   API Gateway (Cognito authorizer validates JWT) ──> Lambda Web Adapter ──>
   Express.js (Node 22, arm64 Lambda) ──> DynamoDB (single-table: EducationTable)

Auth: AWS Cognito User Pool (email/password + Google OAuth federation).
Event-driven sign-up: Cognito PostConfirmation Lambda ──> SNS topic ──>
   Student Onboarding Lambda ──> DynamoDB (with a DLQ on failure).
```

Two independently deployed packages — **frontend (Vercel)** and **backend (AWS SAM)**
— whose only contract is the HTTP API. They never import each other's source
(`invariants.md` INV: `frontend-no-backend-import`).

## Backend layering — feature vertical slices

There is **no global `routes/`/`services/`/`models/`**. Each feature owns its slice
under `backend/src/features/<feature>/`:

```
<feature>.routes.ts      HTTP layer: auth check, input validation, status codes
   └─ <feature>.service.ts    business logic (some simple features skip this)
        └─ <feature>.repository.ts   ALL DynamoDB I/O via the shared docClient
<feature>.types.ts / .entity.ts   shapes
```

Dependency direction is strictly downward (routes → service → repository); lower
layers never import upward. Cross-cutting concerns live in `backend/src/lib/`
(logger, metrics, dynamodb client, auth-utils, cloudfront/sns helpers). The Express
app is composed in a single root, `backend/src/app.ts`, which mounts every feature
router under `/api/*` — the one place to see the full URL surface.

**Separate from Express:** event-driven Lambda handlers in `backend/src/lambdas/`
(`post-confirmation.ts`, `student-onboarding.ts`) are their own entrypoints, not
routes. `student-onboarding.ts` builds its own DocumentClient (it's a different
Lambda), which is the one sanctioned exception to "DynamoDB only via repositories."

## Data model — single-table DynamoDB

One table, `EducationTable` (env `EDUCATION_TABLE_NAME`; defined in `backend/template.yaml`):
- Primary key `PK` (HASH) + `SK` (RANGE); GSI `GSI1` (`GSI1PK`/`GSI1SK`); GSI `email-index` (HASH `email`).
- Item shapes by `entityType`, e.g. user = `PK=USER#<id>, SK=METADATA`; enrollment =
  `PK=USER#<id>, SK=COURSE#<courseId>`, mirrored on `GSI1` for the inverse lookup.
- Repositories build keys, use `ConditionExpression: attribute_not_exists(PK)` to
  prevent duplicate writes, and **strip internal keys** (`PK,SK,GSI1PK,GSI1SK,entityType`)
  before returning domain objects.

## Auth — two schemes, one identity

- **Frontend protection:** NextAuth (`strategy: 'jwt'`, httpOnly cookie). The
  `authorized` callback + `frontend/proxy.ts` (Next.js middleware) gate routes; the
  JWT carries the Cognito access/id/refresh tokens, refreshed on expiry.
- **Backend protection:** API Gateway's **Cognito authorizer** validates the JWT
  natively and injects claims into the request context. Express reads the user via
  `getUserIdFromContext(req)` (parses the `x-amzn-request-context` header → Cognito
  `sub`) and returns 401 on null. Public routes are explicitly `Authorizer: NONE`
  in `template.yaml` (currently the two SSG course reads).
- **The token on the wire is the Cognito ID token** (not the access token) — API
  Gateway validates the id_token; the frontend sources it server-side via
  `getAuthToken()` and never exposes it to client components.

## Frontend — four ways to reach the backend

All run server-side or proxy through the server; **the browser never holds the
id_token and the frontend never touches the DB**:
1. **Server actions** (`frontend/app/actions/*`, `'use server'`) — mutations.
2. **Server fetchers** (`frontend/lib/data/*`) — reads for server components, with
   Next.js `'use cache'` tags where appropriate.
3. **BFF route handlers** (`frontend/app/api/*`) — let client SWR reach the backend
   while the id_token stays server-side.
4. **Client SWR hooks** (`frontend/hooks/*` via `frontend/lib/fetchers.ts`) — call
   the local `/api/*` BFF with `credentials: 'include'`, never the backend directly.

The backend base URL is `NEXT_PUBLIC_API_URL` (validated accessor `getApiBaseUrl()`
in `frontend/lib/env.ts`). CloudFront signed cookies for video access are minted in
`proxy.ts` against the backend's `video-access` endpoint.

## Why this shape

- **Lambda Web Adapter** lets a normal Express app run serverless without rewriting
  to per-route handlers — familiar code, serverless ops.
- **Single-table design** serves the known access patterns (user, enrollments by
  user, enrollment by course) with two GSIs instead of multiple tables/joins.
- **Event-driven onboarding** decouples sign-up latency from the DynamoDB write and
  gives a retry/DLQ path, so a transient write failure never blocks account creation.
- **BFF pattern** keeps the Cognito id_token off the client entirely.
