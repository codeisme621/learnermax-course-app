# Going live: Vercel, Neon, Stripe, Google and AWS configuration

What has to be configured outside the repo before Preview/Production can run the paid-checkout app (issue #31).
Nothing here has been applied: no deploys, and no production or infrastructure changes have been made.

Vercel project: `learner-max/learnermax-course-app` (root directory `frontend`, Node 22).
Production origin: `https://www.learnwithrico.com`.

## 1. Environment variables

| Variable | Preview | Production | Notes |
|---|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PG*`, `POSTGRES_*` | ✅ already set | ✅ already set | Neon integration: `learnwithrico-preview` / `learnwithrico-production` |
| `BETTER_AUTH_SECRET` | new random value | new random value | `openssl rand -base64 32`; different per environment |
| `BETTER_AUTH_URL` | stable preview origin (see §5) | `https://www.learnwithrico.com` | also the base of Stripe redirect URLs and email links |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from `learnermax/google-oauth` | same | omit to hide the Google button |
| `STRIPE_SECRET_KEY` | sandbox `sk_test_…` | **live** `sk_live_…` (or a restricted key, §3) | |
| `STRIPE_WEBHOOK_SECRET` | sandbox endpoint secret | live endpoint secret | from the Dashboard endpoint created in §3 |
| `EMAIL_TRANSPORT` | `ses` | `ses` | |
| `EMAIL_FROM` | `LearnWithRico <hello@learnwithrico.com>` | same | any address @learnwithrico.com (domain is verified in SES) |
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

For each account (sandbox for Preview, live for Production):

1. **Product and price:** `STRIPE_SECRET_KEY=<that account's key> pnpm stripe:setup`. This creates
   "Agentic Coding" at $399.00 USD with lookup key `agentic-coding-usd-39900`. The app finds the price by
   lookup key and refuses to start checkout if Stripe's amount or currency differs from the course's.
2. **Webhook endpoint:** Developers → Webhooks → Add endpoint:
   - URL: `https://<origin>/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `refund.created`, `refund.updated`
   - Copy its signing secret into `STRIPE_WEBHOOK_SECRET` for that environment.
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

The authorized redirect URIs currently point at the Cognito hosted domain for preview and production. Add:

- `https://www.learnwithrico.com/api/auth/callback/google`
- `https://<stable preview origin>/api/auth/callback/google`
- keep `http://localhost:3000/api/auth/callback/google`

You can remove the Cognito `…/oauth2/idpresponse` URIs once Cognito is retired.

**Preview origins:** Google and Stripe need fixed URLs, but each Vercel preview deployment gets a new one.
Give Preview a stable domain (for example `preview.learnwithrico.com` attached to a `preview` branch) and
set `BETTER_AUTH_URL` to it. Ad-hoc per-commit preview URLs still render, but sign-in callbacks and Stripe
redirects go to the stable origin.

## 6. Legacy AWS stack

Cognito, API Gateway, the Express Lambda, DynamoDB, SNS onboarding/email Lambdas and the CloudFront video
infrastructure are **no longer called by the app** (a test enforces this:
`frontend/platform/runtime-boundaries.test.ts`). They were deliberately left deployed and untouched; retire
them separately, and keep the video infrastructure until the Mux work lands.
