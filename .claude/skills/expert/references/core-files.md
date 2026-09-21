# Core files & abstractions

Paths relative to repo root. The map; for the *why* see `architecture.md`.

## Backend (`backend/`) — Express on Lambda + DynamoDB

| File | Role |
|---|---|
| `src/app.ts` | Express composition root — mounts every feature router under `/api/*`. The full URL surface. Listens on :8080 (skipped when `NODE_ENV==='test'`). |
| `src/run.sh` | Lambda Web Adapter entry (`node dist/app.js`). |
| `template.yaml` | SAM infra — API Gateway + Cognito authorizer, DynamoDB `EducationTable` (PK/SK, GSI1, email-index), the two trigger Lambdas, SNS topic + DLQ, public-vs-protected route config. |
| `src/lib/dynamodb.ts` | The shared `docClient` (`DynamoDBDocumentClient`). The ONE DB client for the Express app. |
| `src/lib/auth-utils.ts` | `getUserIdFromContext(req)` / `getUserClaimsFromContext(req)` — parse Cognito `sub`/claims from the `x-amzn-request-context` header. |
| `src/lib/logger.ts` / `src/lib/metrics.ts` | `createLogger()` / `createMetrics()` — Powertools structured logs + EMF metrics. |
| `src/lib/cloudfront-signer.ts`, `cloudfront-cookies.ts`, `sns.ts` | signed-URL/cookie + SNS helpers. |
| `src/middleware/observability.middleware.ts` | wraps `res.end` to log + emit latency/4xx/5xx metrics per request. |
| `src/features/<f>/<f>.routes.ts` `.service.ts` `.repository.ts` `.types.ts` | the per-feature vertical slice. Features: `students`, `enrollment` (+ `strategies/`), `courses`, `lessons` (+ `services/video-url-service.ts`), `progress`, `meetups`, `feedback`, `video-access`. |
| `src/lambdas/post-confirmation.ts` | Cognito PostConfirmation trigger → publishes onboarding msg to SNS (never throws — won't block sign-up). |
| `src/lambdas/student-onboarding.ts` | SNS-triggered writer → student item to DynamoDB, `attribute_not_exists(PK)` for idempotency; re-throws non-duplicate errors → SNS retry → DLQ. Builds its own docClient (sanctioned exception). |

## Frontend (`frontend/`) — Next.js 15 App Router

| File | Role |
|---|---|
| `app/layout.tsx` | only layout — `SessionProvider`, `SWRProvider`, fonts, Analytics. |
| `app/page.tsx`, `app/dashboard/page.tsx`, `app/course/[courseId]/page.tsx`, `app/signin`, `app/enroll`, `app/verify-email` | the page routes (dashboard + course are auth-guarded). |
| `proxy.ts` | Next.js middleware (named `proxy` in Next 16+). Mints CloudFront signed cookies for `/course/*` via the backend `video-access` endpoint, then falls through to NextAuth `auth()` route protection. |
| `auth.config.ts` + `lib/auth.ts` | NextAuth: JWT session, `authorized` route-protection callback, token refresh; providers = Cognito OIDC (Google federation) + Credentials (email/password via `lib/cognito-auth.ts`). |
| `lib/cognito.ts`, `lib/cognito-auth.ts` | direct Cognito SDK calls (sign-up/confirm/resend; password auth). The only `@aws-sdk/*` in the frontend (Cognito, not DB). |
| `app/actions/*.ts` (`'use server'`) | mutations: `auth`, `enrollments`, `progress`, `students`, `meetups`, `feedback`. `auth.ts:getAuthToken()` is the single server-side id_token accessor. |
| `lib/data/*.ts` | server fetchers for server components (with `'use cache'` tags). |
| `app/api/*/route.ts` | BFF route handlers — let client SWR reach the backend with the id_token kept server-side. |
| `lib/fetchers.ts` + `hooks/use*.ts` | client SWR layer — call the local `/api/*` BFF only. |
| `lib/env.ts` | `getApiBaseUrl()` — validated `NEXT_PUBLIC_API_URL` accessor (throws if unset). |
| `components/ui/*` | shadcn primitives (new-york style, `components.json`); `components/<feature>/*` for domain components. |

## E2E (`e2e/`) & root scripts

| File | Role |
|---|---|
| `e2e/playwright.config.ts` | two projects: `api` (REST, no browser) + `ui` (Chrome, `BASE_URL`). Runs against a deployed Vercel **preview**, not a local server. |
| `e2e/.env` | `BASE_URL`, `API_URL`, `API_KEY`, `VERCEL_AUTOMATION_BYPASS_SECRET` — written by the deploy scripts. |
| `scripts/deploy-preview-{backend,frontend}.sh` | SAM `--config-env preview` / Vercel deploy; write endpoints back into `e2e/.env`. |
| `scripts/{start,stop}-{sam,vercel}-logs.sh` | tail deploy logs into `scripts/.{sam,vercel}-logs.log` (the agent "signal" log files). |
| `scripts/local-checks.sh` + `scripts/lints/*.sh` | the deterministic gate (see `verification.md`). |
