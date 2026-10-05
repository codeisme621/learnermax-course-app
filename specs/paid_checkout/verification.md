# Paid Checkout — Verification Map (issue #31)

Every acceptance criterion, the check that proves it, and how to run it.
`cd frontend && pnpm verify` runs typecheck, lint, every Vitest file and every Playwright spec.

- **Vitest** runs against a freshly reset Neon `test` branch (migrations + seed every run).
  Purchase tests create real sandbox Checkout Sessions and feed `handleStripeEvent` signed
  webhook payloads built from them.
- **Playwright** runs the real app on :3100. Checkout specs pay on Stripe's real hosted page
  in the `LearnerMaxSandBox` sandbox, and real webhooks arrive via `stripe listen`.
- **Manual** marks what automation cannot honestly prove (see the checklist at the end).

| # | Acceptance criterion | Proof | Where |
|---|---|---|---|
| 1 | New email buyer: real sandbox checkout → activation via SES → password → dashboard | E2E full flow (email via capture transport) + SES send accepted + owner's manual run | `e2e/checkout.spec.ts` "email buyer…"; manual M2 |
| 2 | New Google buyer: OAuth + payment → dashboard | Linking/sign-up rules on Better Auth's real callback step; signed-in purchase + resume-to-payment E2E | `features/accounts/google-linking.test.ts`; `e2e/checkout.spec.ts` "…resumes straight to payment"; `purchases.service.test.ts` "signed-in buyer…"; manual M1 |
| 3 | Email purchaser later uses Google (same verified email) — same account, keeps access | Better Auth links to the existing account; one user; access active | `google-linking.test.ts` "an email purchaser later signing in with Google…" |
| 4 | Different Google email cannot claim the purchase | Gets its own account, no access; buyer's account untouched | `google-linking.test.ts` "a different Google email…" |
| — | No force-linking of an unverified provider email | Google `email_verified=false` → not linked (mutation-checked: fails if Google is a trusted provider) | `google-linking.test.ts` "does not link when Google reports…" |
| 5 | Password login, sign-out, reset, activation expiry and resend | E2E for each | `e2e/accounts.spec.ts` (sign-in/out, reset, expired link + resend, single-use link) |
| 6 | Unpaid, pending, failed, cancelled, refunded → no protected data | Unpaid E2E + API 403; pending/expired service test; declined card E2E; refund E2E | `accounts.spec.ts` "without a paid enrollment…", "API authorization boundaries"; `purchases.service.test.ts` "never completed…"; `checkout.spec.ts` "a declined card…", refund step |
| 7 | Unpaid Google accounts can resume purchase without gaining access | Signed-in unpaid account → `/checkout?resume=1` → Stripe; dashboard/course redirect to checkout | `checkout.spec.ts` "…resumes straight to payment"; `accounts.spec.ts` |
| 8 | Buyer closing the browser after payment still gets activation/access | Success page blocked; webhook alone fulfills and emails | `checkout.spec.ts` "buyer who never returns…" |
| 9 | Success-page/webhook race without double enrollment or premature access | Status `processing` until webhook; forged success URL grants nothing; one enrollment | `purchases.service.test.ts` "provisions the buyer…"; `checkout.spec.ts` "visiting a success URL…" |
| 10 | Duplicate/concurrent webhook delivery → one durable fulfillment | Same event twice; 4 concurrent deliveries incl. a second event id | `purchases.service.test.ts` "duplicate delivery…", "concurrent deliveries" |
| 11 | Forged webhook, altered price/user refs, another user's purchase/session grant nothing | Bad/missing/tampered signatures (service + HTTP 400); mismatched amount/currency/course/reference; client price/userId ignored; 401/403 across users | `purchases.service.test.ts`; `api-contracts.spec.ts` webhook; `checkout.spec.ts` "ignores client-supplied…"; `enrollment.service.test.ts` "never leaks access…" |
| 12 | Full refund revokes access incl. existing sessions; account remains | Real Stripe refund → webhook → signed-in buyer locked out on next request; account kept | `checkout.spec.ts` refund step; `purchases.service.test.ts` refunds |
| 13 | Repurchase restores access; stale events cannot | Repurchase E2E; stale completion and replayed old refund are no-ops | `checkout.spec.ts`; `purchases.service.test.ts`; `enrollment.service.test.ts` |
| 14 | Dashboard renders with preserved contracts and UI | Dashboard E2E; REST shapes + error formats; removed endpoints gone | `accounts.spec.ts`; `api-contracts.spec.ts` |
| 15 | Runtime makes no Cognito / API Gateway / Lambda / DynamoDB calls | Static guard over all runtime code + deps (SES is the only AWS client); browser sees no AWS requests during a full purchase | `platform/runtime-boundaries.test.ts`; `checkout.spec.ts` legacy-request assertion |
| 16 | Remaining AWS dependencies and deferred video behavior documented | Handoff report (phase 6) | `specs/paid_checkout/` |
| 17 | Fresh database from migrations/seeds | Every Vitest and Playwright run drops the test branch and rebuilds it from checked-in migrations + seed | `platform/db/testing/test-database.ts` |

Also covered: account provisioning is idempotent and race-safe, and never assigns a password
(`accounts.service.test.ts`); activation resend never reveals whether an account exists
(service + HTTP 202); every account gets a student profile (`accounts`, `google-linking` tests);
sign-out clears all cached user data in the tab (`useSignOut`).

## Manual checklist (needs real third parties)

Run with `pnpm dev` and `pnpm stripe:listen` (second terminal).

- **M1 Google buyer.** Signed out, `/checkout` → Continue with Google → you return to
  `/checkout?resume=1` and go straight to Stripe → pay with `4242 4242 4242 4242` → dashboard.
  Sign out, sign in with Google again → dashboard, without paying.
- **M2 Real inbox (SES).** Buy with a real email address you can read → the activation email
  arrives from `support@learnwithrico.com` (it was sent from `hello@` during the 2026-10-04 run) → the link activates → set a password → dashboard.
  *(Done by the owner on 2026-10-04.)*
- **M3 Google with the purchase email.** After M2, sign out → Continue with Google using that
  same email → same dashboard, with no new purchase.
- **M4 Refund in the Dashboard.** In the Stripe sandbox Dashboard, refund the M2 payment → reload
  `/dashboard` → you are sent to `/checkout`, and the account still signs in.
