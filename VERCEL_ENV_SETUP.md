# Going live: Vercel, Neon, Stripe, Google and AWS configuration

What has to be configured outside the repo before Preview/Production can run the paid-checkout app (issue #31).
Nothing here has been applied: no deploys, and no production or infrastructure changes have been made.

Vercel project: `learner-max/learnermax-course-app` (root directory `frontend`, Node 22).
Production origin: `https://www.learnwithrico.com`.

## 1. Environment variables

| Variable | Preview | Production | Notes |
|---|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PG*`, `POSTGRES_*` | ✅ already set | ✅ already set | Neon integration: `learnwithrico-preview` / `learnwithrico-production` |
| `BETTER_AUTH_SECRET` | random, **sensitive** | random, **sensitive** | `openssl rand -base64 32`; different per environment |
| `BETTER_AUTH_URL` | **leave unset** | `https://www.learnwithrico.com` | Preview derives its origin from `VERCEL_BRANCH_URL`/`VERCEL_URL` (dynamic URLs) |
| `OAUTH_PROXY_SECRET` | shared random value, **sensitive** | **the same value**, **sensitive** | lets dynamic previews use Google through production's callback (§5) |
| `AUTH_PRODUCTION_URL` | `https://www.learnwithrico.com` | `https://www.learnwithrico.com` | |
| `OPS_SECRET` | random, **sensitive** | random, **sensitive** | protects `/api/ops/reconcile` (`pnpm ops:reconcile`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from `learnermax/google-oauth`, **sensitive** | same | one OAuth client for every environment |
| `STRIPE_SECRET_KEY` | sandbox `sk_test_…`, **sensitive** | **live** key, **sensitive**, pasted by the owner (§3) | |
| `STRIPE_WEBHOOK_SECRET` | the sandbox `stripe listen` secret, **sensitive** | live Dashboard endpoint secret, **sensitive**, pasted by the owner | previews get webhooks via CLI forwarding (§3) |
| `EMAIL_TRANSPORT` | `ses` | `ses` | |
| `EMAIL_FROM` | `LearnWithRico <support@learnwithrico.com>` | same | any address @learnwithrico.com (domain is verified in SES) |
| `AWS_REGION` | `us-east-1` | `us-east-1` | must be pinned; Vercel otherwise sets it to the function region |
| `AWS_ROLE_ARN` | role from §4 | same | enables OIDC credentials for SES |
| `NEXT_PUBLIC_HERO_VIDEO_PLAYBACK_ID` | ✅ already set | ✅ already set | |

**Remove these legacy variables, which nothing reads anymore:** `AUTH_SECRET`, `AUTH_URL`,
`COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_ISSUER_URL`,
`COGNITO_USER_POOL_DOMAIN`, `NEXT_PUBLIC_COGNITO_REGION`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`,
`NEXT_PUBLIC_API_URL`, `COOKIE_DOMAIN` and `NEXT_PUBLIC_VIDEO_CDN_DOMAIN`.

## 2. Database (Neon)

Each environment's database is empty until migrated. Variables already set in the shell take precedence
over `.env.local` (dotenv never overrides them), so point the normal scripts at the target database:

```bash
cd frontend
vercel env pull .env.target --environment=production        # or preview
URL="$(grep '^DATABASE_URL_UNPOOLED=' .env.target | cut -d= -f2- | tr -d '"')"
DATABASE_URL="$URL" DATABASE_URL_UNPOOLED="$URL" pnpm db:migrate
DATABASE_URL="$URL" pnpm db:seed
rm .env.target
```

Migrations are additive SQL in `platform/db/migrations/`, and the seed is idempotent. Consider running
`drizzle-kit migrate` as a step in the deploy pipeline once you're comfortable with it.

## 3. Stripe

1. **Product and price.**
   - Sandbox: `pnpm stripe:setup`.
   - Live: the same product and price ("Agentic Coding", $399.00 USD, lookup key `agentic-coding-usd-39900`),
     created through the Stripe MCP once it's connected to the live account, or in the Dashboard. The live key
     never leaves Vercel.
   - The app finds the price by lookup key and refuses to start checkout if Stripe's amount or currency
     differs from the course's.
2. **Webhooks.**
   - **Production:** Developers → Webhooks → Add endpoint `https://www.learnwithrico.com/api/webhooks/stripe` with
     events `checkout.session.completed`, `checkout.session.expired`, `refund.created`, `refund.updated`. The owner
     pastes its signing secret into the Production `STRIPE_WEBHOOK_SECRET`.
   - **Preview:** URLs are dynamic, so there's no Dashboard endpoint. While verifying a preview,
     `pnpm smoke <preview-url> --purchase` forwards sandbox events with `stripe listen` (plus the protection-bypass
     header). Preview's `STRIPE_WEBHOOK_SECRET` is the sandbox CLI listen secret, the same one used locally.
3. **Payment methods:** checkout allows only card (including Apple Pay and Google Pay) and Link, which
   confirm synchronously. Disable Link in the Dashboard if you don't want it offered.
4. **Optional, least privilege:** a restricted key with write access to Checkout Sessions, and read access
   to Prices, Payment Intents and Refunds.
5. **Refund policy as implemented:** any refund that reaches `succeeded` revokes access, because partial
   refunds are not offered. Refund from the Dashboard within the 30-day window.

## 4. AWS: SES from Vercel through OIDC (no long-lived keys)

The only AWS service the app calls at runtime is **SES `SendEmail`**. Credentials come from Vercel OIDC.

1. **IAM → Identity providers → Add provider → OpenID Connect**
   - Provider URL: `https://oidc.vercel.com/learner-max` (team issuer mode; check
     Project Settings → Security → OIDC Federation. If it shows Global, use `https://oidc.vercel.com`)
   - Audience: `https://vercel.com/learner-max`
2. **IAM role `learnwithrico-ses-sender`, trust policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::853219709625:oidc-provider/oidc.vercel.com/learner-max" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "oidc.vercel.com/learner-max:aud": "https://vercel.com/learner-max" },
      "StringLike": {
        "oidc.vercel.com/learner-max:sub": [
          "owner:learner-max:project:learnermax-course-app:environment:preview",
          "owner:learner-max:project:learnermax-course-app:environment:production"
        ]
      }
    }
  }]
}
```

3. **Permission policy (send-only, this domain only):**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ses:SendEmail",
    "Resource": "arn:aws:ses:us-east-1:853219709625:identity/learnwithrico.com"
  }]
}
```

4. Set `AWS_ROLE_ARN=arn:aws:iam::853219709625:role/learnwithrico-ses-sender` in Preview and Production.

**Secrets Manager is not used at runtime.** `learnermax/google-oauth` and `learnermax/stripe` remain the
source for local development (`scripts/pull-local-secrets.sh`), and their values are copied into Vercel
environment variables. `learnermax/cloudfront-private-key-*` are not used by the new app.

## 5. Google OAuth (GCP project "Gemini API")

One OAuth client serves every environment. Its authorized redirect URIs must include exactly:

- `http://localhost:3000/api/auth/callback/google` (local)
- `https://www.learnwithrico.com/api/auth/callback/google` (production, **add this**; it currently points at Cognito)

**Previews need no redirect URI of their own.** With `OAUTH_PROXY_SECRET` set in both Preview and Production,
Better Auth's OAuth proxy sends a preview's Google sign-in through production's callback and hands the
encrypted profile back to the preview, which signs the user in against the preview database
(`frontend/features/accounts/oauth-proxy.test.ts`). This only works once production runs this code.

You can remove the Cognito `…/oauth2/idpresponse` URIs once Cognito is retired.

## 6. Legacy AWS stack

Cognito, API Gateway, the Express Lambda, DynamoDB, SNS onboarding/email Lambdas and the CloudFront video
infrastructure are **no longer called by the app** (a test enforces this:
`frontend/platform/runtime-boundaries.test.ts`). They were deliberately left deployed and untouched; retire
them separately, and keep the video infrastructure until the Mux work lands.
