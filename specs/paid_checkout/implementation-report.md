# Implementation Report — Paid Stripe Checkout + Better Auth on Vercel (issue #31)

Branch `feature/enable-stripe-checkout` (local only). Per the issue: **no PR, no deploy, and no changes to
production infrastructure.** The owner inspects and verifies locally, then asks for a PR.

## Outcome

A buyer can pay $399 for **Agentic Coding** through Stripe-hosted Checkout, using an email address or
Google. They are provisioned and emailed an activation link through SES, set a password (or use Google),
and land on the existing dashboard with paid access. Everything the dashboard needs now runs inside
Next.js on Neon Postgres. The runtime makes no Cognito, API Gateway, Lambda or DynamoDB calls, and SES
is its only AWS dependency.

## Commits

| Commit | Summary |
|---|---|
| `f4eddb5` | Postgres foundation: feature-first layout, Drizzle on the Neon Pool driver, all schemas (Better Auth generated), first migration, seed |
| `620d4bb` | Neon agent skills installed by the Vercel integration |
| `314e9da` | Meetups retired; Jest/MSW replaced by Vitest (real DB) and Playwright; landing page served from Postgres; ESLint and the 52 type errors fixed |
| `f10d319` | NextAuth/Cognito replaced by Better Auth; activation, reset and Google; dashboard services and REST routes in Next.js |
| `16b82d2` | Stripe Checkout, webhook fulfillment, refunds, checkout and success pages, local secret and webhook scripts |
| `9e77b49` | Checkout/account UX: visible fields and a contrasting card (theme token fix) |
| `0839127` | Every acceptance criterion proven; Google linking and SWR cache fixes; dead CloudFront player removed |
| *(this commit)* | Handoff: `.env.example`, runbook, deployment config, build gate, Next.js control-flow fix, OIDC package |

Overall diff vs `main`: about 250 files, +10.3k / −23k lines. Most deletions are the old Jest/MSW suites,
NextAuth/Cognito, and the API-Gateway data layer.

## Changed files, by area (`frontend/` unless noted)

- **features/**, one folder per business feature, each with `index.ts` as its public API:
  - `purchases`: checkout, status, Stripe webhook fulfillment and refunds.
  - `accounts`: Better Auth configuration, provisioning, activation, sessions, emails.
  - `enrollment`: access rules and guards.
  - `courses`: catalog, lessons, server-owned offer.
  - `progress`, `students`, `feedback`.
- **platform/**:
  - `db/`: client, migrations, seed, test reset and fixtures.
  - `stripe/`: client, webhook verification, test helpers, `setup-prices.ts`.
  - `email/`: SES with OIDC, capture transport, layout.
  - `errors.ts`, `http.ts`, `runtime-boundaries.test.ts`.
- **app/**:
  - Pages: `/checkout`, `/checkout/success`, `/activate`, `/forgot-password`, `/reset-password`; `/signin`,
    `/dashboard` and `/course/[id]` rebuilt.
  - REST routes under `app/api/*`: courses, lessons, students, enrollments, progress, feedback, checkout,
    activation resend, Stripe webhook, and Better Auth at `/api/auth/*`.
  - Server actions: checkout, accounts, progress, feedback, students.
- **components/**:
  - New: `auth/*` and `checkout/*`.
  - Changed: dashboard `CourseCard` (paid-only) and `DashboardContent`; header sign-out and minimal header;
    landing CTAs → `/checkout`.
  - Removed: enrollment forms, meetups, the CloudFront `VideoPlayer` and `CourseVideoSection`, the session provider.
- **Removed:** NextAuth (`lib/auth.ts`, `auth.config.ts`), Cognito clients, `lib/data/*` (API Gateway
  fetchers), `/enroll`, `/verify-email`, Jest config, about 40 mocked-API test files, the root `e2e/`
  package, `hls.js`, `next-auth`, `@aws-sdk/client-cognito-identity-provider`.
- **Tests:**
  - 9 Vitest files (55 tests): accounts, Google linking, enrollment, progress, feedback, students, courses,
    purchases, runtime boundaries.
  - 4 Playwright specs (20 tests): landing, accounts, checkout, API contracts.
- **Scripts:** `scripts/pull-local-secrets.sh`, `scripts/stripe-listen.sh`; `pnpm stripe:setup`, `pnpm db:*`,
  `pnpm build:check`, `pnpm verify`.
- **Docs:**
  - New: `.env.example`, `README.md` (setup and runbook), `../VERCEL_ENV_SETUP.md` (go-live configuration),
    and `../specs/paid_checkout/{design,verification,implementation-report}.md`.
  - Rewritten: `../AGENTS.md`, `../CLAUDE.md`.
  - Legacy banners added to `../architecture*.md`.

## Commands and results (final run)

```
cd frontend && pnpm verify          # exit 0, 255 s
  typecheck     tsc --noEmit                     ✓ 0 errors
  lint          eslint                           ✓ 0 errors, 0 warnings
  build:check   next build                       ✓ 22 routes; 0 errors in build output
  test          vitest run                       ✓ 9 files, 55 tests (real Neon test branch + Stripe sandbox)
  test:e2e      playwright test                  ✓ 20 tests (real Stripe-hosted Checkout + stripe listen)
```

Also run:
- `next start` on the production build: `/`, `/checkout`, `/signin` and `/api/courses` return 200;
  `/api/enrollments` returns 401; `/dashboard` redirects to `/signin`.
- `pnpm stripe:setup` run twice: the second run reports "already exists".
- `auth generate` against the final config: no schema drift.
- A real SES send was accepted.
- **Manual (owner):** a real email purchase delivered by SES to a real inbox, activated, dashboard reached.

How each acceptance criterion is proven: `verification.md`.

## Issues found and fixed during verification

- **Better Auth's trusted-provider setting** would have linked unverified Google emails into existing
  accounts. Linking now requires Google `email_verified` **and** an activated account. Guarded by a
  mutation-checked test.
- **SWR cache survived sign-out:** a second user in the same tab could briefly see the previous user's
  enrollments and progress. It is now cleared on sign-out.
- **Route-handler error wrapper swallowed Next.js control flow:** prerender bailouts, and potentially
  `redirect()` and `notFound()`. It now rethrows with `unstable_rethrow`. Only the production build revealed
  this, so the build is now part of `pnpm verify`.
- **Invisible inputs and flat cards app-wide:** theme `--input` token at 98% lightness, and zero-alpha shadows.
- **Deprecated OIDC import:** `@vercel/functions/oidc` replaced by `@vercel/oidc-aws-credentials-provider`.

## Remaining AWS dependencies

| Call | Where | Purpose | Credentials |
|---|---|---|---|
| SES `SendEmail` (v2), us-east-1 | `platform/email/email.ts` | activation, password reset, "you're in" emails | Vercel: OIDC role (`AWS_ROLE_ARN`). Local: default AWS chain |
| STS `AssumeRoleWithWebIdentity` | via `@vercel/oidc-aws-credentials-provider` | exchange the Vercel OIDC token for SES credentials | Vercel OIDC |
| Secrets Manager `GetSecretValue` | `scripts/pull-local-secrets.sh` only, **not runtime** | copy Google and Stripe secrets into `.env.local` | developer's AWS credentials |

Exact IAM trust and permission policies: `VERCEL_ENV_SETUP.md` §4.

## Deferred video behavior

- `/course/[courseId]` is access-guarded and shows a "Lessons are on the way" page with the course overview.
  There are no video calls.
- Dashboard course cards say "Lessons coming soon" while the course has no lessons.
- Lessons, progress and their APIs are in place: lesson IDs are unique per course, and progress validates
  lesson membership. Mux adds a lesson column and `GET /api/courses/:id/lessons/:lessonId/playback` behind
  `requireCourseAccess` (design §6).
- The legacy CloudFront/S3/MediaConvert stack is untouched and still deployed.

## Required external configuration before going live

Not done; all of it is in `VERCEL_ENV_SETUP.md`:

1. Vercel environment variables for Preview and Production (Better Auth secret and URL, Google, Stripe,
   SES/OIDC). Remove the 12 legacy Cognito/API variables.
2. Migrate and seed the `learnwithrico-preview` and `learnwithrico-production` Neon databases.
3. Stripe live account: `pnpm stripe:setup` and a webhook endpoint (4 events). Same for the sandbox endpoint
   that Preview uses.
4. AWS: Vercel OIDC identity provider plus the `learnwithrico-ses-sender` role.
5. Google OAuth (GCP "Gemini API"): add the production and stable-preview callback URLs. They currently
   point at Cognito.
6. A stable preview domain for `BETTER_AUTH_URL` (Google and Stripe need fixed URLs).

## Remaining limitations and decisions

- **Google OAuth is not automated end to end.** Linking rules are tested on Better Auth's real callback step.
  The real Google round trip is manual checks M1 and M3 in `verification.md`.
- **Refunds:** any succeeded refund revokes access, because partial refunds aren't offered. A refund that
  later fails (`refund.failed`) does **not** restore access automatically; re-grant by repurchase or a manual
  database fix.
- **A second payment for an owned course** is recorded and access is unaffected, but it is not
  auto-refunded. Refund it in the Dashboard.
- **Email is best-effort after commit.** There is no outbox or retry worker; recovery is the "Resend
  activation email" button on `/signin` and the success page.
- **Google sign-in for an unactivated purchase account** is refused (Better Auth won't link to an unproven
  account); `/signin` explains this and offers a resend. Google accounts whose email Google reports as
  unverified can sign up and buy as their own account, but are never merged into an existing one.
- **Abandoned checkouts:** each attempt creates a pending purchase and a Checkout Session that expires after
  30 minutes. No reuse.
- **Better Auth rate limiting** uses its default in-memory store, which is per instance on serverless.
  Consider secondary storage (e.g. Upstash Redis) before launch if abuse is a concern.
- **No automated test for the SWR clear on sign-out** (a sub-second flash is hard to assert reliably). It was
  reviewed manually.
- **One unreproduced Next.js dev-overlay "1 Issue" badge** during the first screenshot run: two
  re-runs showed no console or page errors.
- **Not migrated:** existing Cognito users and DynamoDB data (by design). `backend/` and the legacy AWS stack
  remain in the repo and deployed.
- **Local Node:** the tooling needs Node 22 (`.nvmrc`); the machine's nvm default is still Node 20.
- **`.env.local` still contains old variables:** `AUTH_SECRET`, `AUTH_URL` and `NEXT_PUBLIC_API_URL` are
  unused and safe to delete.

## Manual verification steps for the owner

From `frontend/`:
1. `pnpm verify`: expect exit 0.
2. `pnpm dev` + `pnpm stripe:listen`, then the purchase walkthrough in `README.md` → "Try the purchase flow".
3. The checklist in `verification.md` (M1 Google buyer, M3 Google with the purchase email, M4 Dashboard refund).
