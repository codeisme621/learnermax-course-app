---
name: external-systems
description: Registry of the external systems LearnWithRico depends on — Vercel, Neon, Stripe, AWS (SES/IAM/Secrets Manager), Google OAuth (GCP), Mux, GitHub — with resource IDs per environment (local, preview, production), how Claude connects to each (CLI or MCP), where credentials live, how to promote a change from local to production, and how each environment is verified. Use before inspecting or changing any of these systems, adding an environment variable or secret, deploying, migrating a database, setting up webhooks or OAuth redirects, or verifying a deployment.
---

# External systems

The app (`frontend/`) runs on Vercel and depends on the services below. **Read this before touching any of
them.** For the full go-live setup see `VERCEL_ENV_SETUP.md`; for the app runbook see `frontend/README.md`.

## Guardrails (always)

- **Ask the owner before every change to an external system**, and get approval for each step, not once per task.
  Approval for preview never covers production. Reading is fine; writing needs a yes.
- **Live Stripe keys never leave Vercel.** They are *sensitive* environment variables, which can't be pulled
  locally. Never put a live key in `.env.local`, a script or a commit. The owner pastes live secrets into Vercel
  themselves; Claude creates non-secret resources (prices) and sets non-secret variables.
- **Never print secret values.** Write them straight into env files or Vercel, and report key names only.
- **Production database changes** are migrations that are already checked in and already proven on preview.
  No ad-hoc SQL writes against production.
- When a safety classifier blocks an action, stop and tell the owner; don't route around it.

## Environments

| | Local | Preview | Production |
|---|---|---|---|
| URL | `http://localhost:3000` | dynamic `*-learner-max.vercel.app` per deployment (Vercel Authentication protected) | `https://www.learnwithrico.com` |
| App origin | `BETTER_AUTH_URL` in `.env.local` | **unset**: derived from `VERCEL_BRANCH_URL` / `VERCEL_URL` (`platform/app-url.ts`) | `BETTER_AUTH_URL=https://www.learnwithrico.com` |
| Database | Neon `learnwithrico-preview` → branch `dev` (tests: branch `test`) | Neon `learnwithrico-preview` (main branch) | Neon `learnwithrico-production` |
| Stripe | sandbox `LearnerMaxSandBox` | same sandbox | **live** account |
| Stripe webhooks | `pnpm stripe:listen` (CLI forwarding) | `stripe listen` forwarding during verification (`pnpm smoke <url> --purchase`) | Dashboard webhook endpoint |
| Email | SES (local AWS credentials) or `EMAIL_TRANSPORT=capture` in tests | SES via Vercel OIDC role | SES via Vercel OIDC role |
| Google OAuth | one OAuth client, direct (`localhost` callback) | the same client, through the **OAuth proxy** (production's callback) | the same client, direct |
| Mux | one Mux environment; the hero video's public playback ID is shared by all three | ← | ← |

## Credentials matrix

| Variable | Local (`frontend/.env.local`) | Preview (Vercel) | Production (Vercel) | Source of truth |
|---|---|---|---|---|
| `DATABASE_URL` (+`_UNPOOLED`, `PG*`) | Neon `dev` branch | set by the Neon integration | set by the Neon integration | `neonctl connection-string` / Vercel |
| `BETTER_AUTH_SECRET` | local random | random, **sensitive** | random, **sensitive** | `openssl rand -base64 32` (different per environment) |
| `BETTER_AUTH_URL` | `http://localhost:3000` | *(unset)* | `https://www.learnwithrico.com` | — |
| `OAUTH_PROXY_SECRET` | *(unset)* | shared value, **sensitive** | the same value, **sensitive** | `openssl rand -base64 32` |
| `AUTH_PRODUCTION_URL` | — | `https://www.learnwithrico.com` | `https://www.learnwithrico.com` | — |
| `GOOGLE_CLIENT_ID` / `_SECRET` | `scripts/pull-local-secrets.sh` | **sensitive** | **sensitive** | AWS Secrets Manager `learnermax/google-oauth` (GCP project "Gemini API") |
| `STRIPE_SECRET_KEY` | sandbox (pull script) | sandbox, **sensitive** | **live**, **sensitive** (owner pastes) | sandbox: Secrets Manager `learnermax/stripe`; live: Stripe Dashboard only |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen --print-secret` | the same CLI listen secret | live Dashboard endpoint secret (owner pastes) | Stripe |
| `EMAIL_TRANSPORT` / `EMAIL_FROM` / `AWS_REGION` | `ses` / `LearnWithRico <hello@learnwithrico.com>` / `us-east-1` | same | same | — |
| `AWS_ROLE_ARN` | *(unset: default credential chain)* | `arn:aws:iam::853219709625:role/learnwithrico-ses-sender` | same | AWS IAM |
| `OPS_SECRET` | optional | random, **sensitive** | random, **sensitive** | `openssl rand -hex 32`; used by `pnpm ops:reconcile` |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | export when running smoke tests | system variable (Deployment Protection → Protection Bypass for Automation) | — | Vercel |
| `NEXT_PUBLIC_HERO_VIDEO_PLAYBACK_ID` | Mux playback ID | same | same | Mux (public) |

## Systems: how Claude connects, and what lives there

### Vercel (hosting): team `learner-max`, project `learnermax-course-app` (`prj_ew1ePGJTLbOxBTmRSt0drlJS5aET`), root `frontend`
- **MCP** `plugin:vercel` (authenticated): deployments, runtime logs and errors, env vars (never decrypt values),
  domains, docs search. Prefer it for reads such as post-deploy logs.
- **CLI:** use `npx vercel@latest …` (the installed `vercel` 44 is too old for non-interactive integration
  commands). The repo root is linked (`.vercel/project.json`).
- Env vars: `npx vercel@latest env add NAME preview|production [--sensitive]`. Sensitive values can't be read
  back or pulled.
- Deployment Protection: Vercel Authentication on all deployments except custom domains. Automation uses the
  bypass secret, as a header or `?x-vercel-protection-bypass=`.
- Rollback: the Vercel dashboard, or MCP `request_rollback`.

### Neon (Postgres): Vercel-managed org `org-noisy-bird-29722272`
- `learnwithrico-production` `gentle-cake-61031284` → Vercel Production.
- `learnwithrico-preview` `jolly-glade-31233563` → Vercel Preview. Branches: `dev` (local), `test` (wiped by every test run).
- **CLI** `neonctl` (authenticated; pass `--org-id org-noisy-bird-29722272`) and **MCP** `neon`: reads, branches,
  connection strings, SQL inspection. **Creating projects fails** ("organization is managed by Vercel"); use
  `npx vercel@latest integration add neon …` instead.
- Schema changes: `pnpm db:generate` → commit → `pnpm db:migrate` against the target (`VERCEL_ENV_SETUP.md` §2).

### Stripe (payments)
- Sandbox `LearnerMaxSandBox` `acct_1Rp9OBQ0A0bb7l8V` (local and preview). The live account is the owner's main
  account; check its activation in the Dashboard.
- **MCP** `stripe`: currently connected to the sandbox only. To work in live mode, the owner re-authorizes it
  (`/mcp` → stripe) to include the live account. Use the MCP for live, non-secret writes such as creating the price.
- **CLI** `stripe`: its saved login expires every 90 days, so always pass `--api-key` (`pnpm stripe:listen`,
  `scripts/smoke.sh` do).
- Product and price: `pnpm stripe:setup` (lookup key `agentic-coding-usd-39900`, idempotent) for the sandbox. Live:
  the same price, created through the MCP or the Dashboard with that lookup key.
- Webhook events: `checkout.session.completed`, `checkout.session.expired`, `refund.created`, `refund.updated` →
  `/api/webhooks/stripe`.

### AWS (account 853219709625, us-east-1)
- **CLI** `aws` (profile user `SAM_CLI`). No MCP.
- **SES:** domain identity `learnwithrico.com` (production access). Runtime sends with `SendEmail` only.
- **IAM:** OIDC provider `oidc.vercel.com/learner-max` plus role `learnwithrico-ses-sender` (policies in
  `VERCEL_ENV_SETUP.md` §4).
- **Secrets Manager:** `learnermax/google-oauth`, `learnermax/stripe` (sandbox) are the local-development source
  only; the runtime never reads Secrets Manager. `learnermax/cloudfront-private-key-*` is legacy.
- Legacy stack (Cognito, API Gateway, Lambdas, DynamoDB, SNS, CloudFront) is still deployed but unused; don't change it.

### Google OAuth: GCP project "Gemini API" (`gen-lang-client-0925799297`)
- **CLI** `~/google-cloud-sdk/bin/gcloud` (not on PATH). **OAuth web clients can't be read or edited by any CLI or
  API.** Redirect URIs are changed by the owner in Cloud Console → APIs & Services → Credentials.
- Required redirect URIs: `http://localhost:3000/api/auth/callback/google` and
  `https://www.learnwithrico.com/api/auth/callback/google`. Previews need none of their own (OAuth proxy).

### Mux (video)
- **MCP** `mux`: one environment containing the hero video (public playback ID). Signed playback for course
  lessons is future work (`specs/paid_checkout/design.md` §6).

### GitHub: `codeisme621/learnermax-course-app`
- **CLI** `gh` (repo and workflow scopes). PRs get a Claude code review (`.github/workflows/claude-review.yml`).
  `main` deploys to production.

## Promoting a change: local → preview → production

1. **Local:** make the change and run `cd frontend && pnpm verify`.
   - For a new env var, add it to `frontend/.env.example` and the matrix above.
   - For a schema change, commit the migration.
2. **Preview** (ask before each external write):
   1. Set any new Preview env vars.
   2. Migrate the preview database.
   3. Push the branch; Vercel builds a preview.
   4. Run `pnpm smoke <preview-url> --purchase` (exporting `VERCEL_AUTOMATION_BYPASS_SECRET`).
   5. The owner tests by hand: real inbox, Google, look and feel.
3. **Production** (ask before each step):
   1. Set any new Production env vars, with live secrets pasted by the owner.
   2. Migrate the production database **before** merging.
   3. The owner merges the PR, which deploys.
   4. Run `pnpm smoke https://www.learnwithrico.com` (read-only).
   5. Read Vercel runtime errors and logs through the MCP for the first hour, and check Stripe webhook delivery status.
   6. Run `OPS_SECRET=… pnpm ops:reconcile https://www.learnwithrico.com` when in doubt.
   7. Something wrong → Vercel instant rollback, then fix forward.

## Verification per environment

| Environment | Proof |
|---|---|
| Local | `pnpm verify`: typecheck, lint, production build, Vitest (real Postgres + Stripe sandbox), Playwright (real Stripe-hosted checkout) |
| PR | Claude code review |
| Preview | `pnpm smoke <url> --purchase`, plus the owner's manual pass |
| Production | read-only `pnpm smoke`, post-deploy log review, manual `pnpm ops:reconcile` |
