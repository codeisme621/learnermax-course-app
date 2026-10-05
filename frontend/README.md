# LearnWithRico app (frontend/)

The whole runtime: Next.js 16 on Vercel, Neon Postgres via Drizzle, Better Auth (email/password and
Google), Stripe Checkout, and AWS SES for email. Architecture and module design:
`../specs/paid_checkout/design.md`. How each requirement is proven: `../specs/paid_checkout/verification.md`.

## One-time setup

Prerequisites: Node 22 (`nvm use` reads `.nvmrc`), pnpm 10, the Stripe CLI, the AWS CLI with credentials for
account 853219709625, and `jq`.

```bash
cd frontend
nvm use
pnpm install
pnpm exec playwright install chromium

cp .env.example .env.local
# 1. DATABASE_URL → the Neon "dev" branch of learnwithrico-preview:
neonctl connection-string dev --project-id jolly-glade-31233563 --pooled
# 2. BETTER_AUTH_SECRET → openssl rand -base64 32
# 3. Google, Stripe sandbox key and the local webhook secret (prints key names only, never values):
./scripts/pull-local-secrets.sh

# Test database (wiped on every test run — never point this at real data):
echo "DATABASE_URL=$(neonctl connection-string test --project-id jolly-glade-31233563 --pooled)" > .env.test.local

pnpm db:migrate && pnpm db:seed   # dev branch: schema + Agentic Coding course
pnpm stripe:setup                 # sandbox: product + $399 price (idempotent)
```

Local AWS credentials (the default chain, e.g. `~/.aws/credentials`) need `ses:SendEmail` on
`arn:aws:ses:us-east-1:853219709625:identity/learnwithrico.com`. Only `pull-local-secrets.sh` uses
Secrets Manager (`secretsmanager:GetSecretValue` on `learnermax/google-oauth` and `learnermax/stripe`).

## Run it locally

```bash
pnpm dev             # terminal 1 → http://localhost:3000
pnpm stripe:listen   # terminal 2 → forwards sandbox webhooks to localhost:3000/api/webhooks/stripe
```

Without `stripe:listen`, payments still succeed in Stripe, but nothing is fulfilled: the success page keeps
saying "Confirming your payment…" and no activation email arrives.

### Try the purchase flow

1. On `/`, click **Join the founding cohort**, enter an email you can read, then **Continue to payment**.
2. Pay with `4242 4242 4242 4242`, any future expiry, any CVC and any ZIP. Untick Stripe's "Save my
   information" (Link) box, or it will ask for a phone number.
3. The success page says "check your email". The activation email comes from `support@learnwithrico.com` (real SES).
4. Open the link, set a password, and you land on the dashboard.
5. Refund the payment in the Stripe sandbox Dashboard, then reload `/dashboard`: you're sent to `/checkout`.

Other cards: `4000 0000 0000 0002` (declined), `4000 0025 0000 3155` (3D Secure).

### Useful commands

| Command | What it does |
|---|---|
| `pnpm verify` | typecheck, lint, Vitest, then Playwright: the definition of done |
| `pnpm test` | Vitest service tests against the Neon `test` branch (reset each run) and the Stripe sandbox |
| `pnpm test:e2e` | Playwright: starts its own server on :3100 against the `test` branch and runs `stripe listen` itself |
| `pnpm db:generate --name <change>` | new SQL migration after a schema change (commit it) |
| `pnpm db:migrate` / `pnpm db:seed` | apply migrations / seed (to whatever `DATABASE_URL` in `.env.local` points at) |
| `pnpm db:studio` | browse the database |
| `pnpm stripe:setup` | create the course's Stripe product + price in the account of `STRIPE_SECRET_KEY` |
| `pnpm stripe:listen [port]` | forward sandbox webhooks to `localhost:[port]` (default 3000) |
| `./scripts/pull-local-secrets.sh` | refresh Google/Stripe secrets in `.env.local` |

### Troubleshooting

- **Google shows `redirect_uri_mismatch`:** the OAuth client (GCP project "Gemini API") must list
  `http://localhost:3000/api/auth/callback/google` exactly.
- **"No active Stripe price with lookup key …":** run `pnpm stripe:setup` for that Stripe account.
- **`stripe listen` reports `api_key_expired`:** you ran plain `stripe listen`. Use `pnpm stripe:listen`,
  which authenticates with `STRIPE_SECRET_KEY` instead of the CLI's 90-day login.
- **A test run fails at "STRIPE_SECRET_KEY … must be a test-mode key":** run `./scripts/pull-local-secrets.sh`.
- **Activation email didn't arrive:** use "Resend activation email" on `/signin` or the success page. Links
  are minted fresh, single-use, and valid for 24 hours.
