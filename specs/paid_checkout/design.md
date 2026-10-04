# Paid Checkout + Better Auth — System Design (draft v2)

Issue: codeisme621/learnermax-course-app#31
Goal: a buyer pays $399 for **Agentic Coding** and lands on the existing dashboard.
Out of scope: video playback (gated until Mux), meetups (retired → Office Hours later),
partial refunds, duplicate-purchase handling.

Level: modules, their public functions, and how they call each other. Internals are
called out (⚠) only where they matter for correctness.

---

## 1. System context

```
 ┌─────────┐        ┌──────────────────── Next.js on Vercel ────────────────────┐
 │ Browser │──────► │  app/          pages · server actions · route handlers    │
 └──┬───┬──┘        │    │                                                      │
    │   │           │    ▼                                                      │
    │   │           │  features/     purchases · accounts · enrollment ·        │
    │   │           │                courses · progress · students · feedback   │
    │   │           │    │                                                      │
    │   │           │    ▼                                                      │
    │   │           │  platform/     db (Drizzle) · stripe · email (SES)        │
    │   │           └────┬──────────────────┬──────────────────┬────────────────┘
    │   │                ▼                  ▼                  ▼
    │   │         ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   └────────►│   Stripe    │    │ Neon        │    │  AWS SES    │
    │  checkout   │  (hosted)   │    │ Postgres    │    │ (OIDC role) │
    │             └──────┬──────┘    └─────────────┘    └─────────────┘
    │                    └── signed webhooks ──► app/api/webhooks/stripe
    │             ┌─────────────┐
    └────────────►│   Google    │  OAuth (via Better Auth, no Cognito)
                  └─────────────┘

 Not in the runtime anymore: Cognito, API Gateway, Express Lambda, DynamoDB, SNS, CloudFront signing.
```

---

## 2. Module design

### 2.1 Folder layout (feature-first)

```
frontend/
  app/                          transport only — no business logic, no SQL
  features/
    purchases/                  buying the course: checkout + Stripe webhook handling
    accounts/                   Better Auth, sessions, activation, buyer provisioning
    enrollment/                 who has access to which course (entitlements) + access guard
    courses/                    course + lesson catalog
    progress/                   lesson completion / last accessed
    students/                   student profile
    feedback/                   feedback submissions
  platform/                     technical plumbing, no business rules
    db/                         Drizzle client (Neon Pool), migrations, seed
    stripe/                     Stripe client + webhook signature verification
    email/                      SES sender + React Email templates
```

Each feature folder:
```
features/<name>/
  index.ts          ← the ONLY file other modules may import (public API)
  <name>.service.ts ← business logic
  <name>.repo.ts    ← Drizzle queries for tables this feature owns
  <name>.schema.ts  ← Drizzle table definitions this feature owns
  <name>.types.ts   ← DTOs (the REST contract shapes)
```
Rules: a feature only touches its own tables; it reaches other features through
their `index.ts`. `app/` calls features; features never import from `app/`.

### 2.2 Module dependency graph

```
                         app/  (pages · actions · /api/* · webhook)
                           │ calls any feature's index.ts
   ┌───────────────────────┼─────────────────────────────────────────────────┐
   │                       ▼                                                 │
   │   ┌──────────────────────────┐                                          │
   │   │ purchases                │                                          │
   │   │  startCheckout           │── getCourseAccess ──────────┐            │
   │   │  getCheckoutStatus       │── grant / revokeForPurchase ┤            │
   │   │  handleStripeEvent       │                             ▼            │
   │   └──┬────────────┬──────────┘                 ┌──────────────────────┐ │
   │      │            │ getOffer                   │ enrollment           │ │
   │      │            ▼                            │  getCourseAccess     │ │
   │      │      ┌──────────────┐                   │  listEnrollments     │ │
   │      │      │ courses      │◄── getCourse ─────│  requireCourseAccess │ │
   │      │      │  listCourses │    (exists?)      │  grant · revoke…     │ │
   │      │      │  getCourse   │                   └──────────┬───────────┘ │
   │      │      │  listLessons │◄─────────┐                   │ requireSession
   │      │      │  getOffer    │          │                   ▼             │
   │      │      └──────────────┘   ┌──────┴───────┐   ┌──────────────────┐  │
   │      │                         │ progress     │   │ accounts         │  │
   │      └── provisionBuyer ──────────────────────────►│  auth (Better A.)│  │
   │          sendAccessEmail       │  getProgress │   │  getSession      │  │
   │                                │  markComplete│   │  requireSession  │  │
   │                                │  trackAccess │   │  provisionBuyer  │  │
   │                                └──────────────┘   │  sendAccessEmail │  │
   │                                                   │  setInitialPwd   │  │
   │   ┌──────────────┐                                └───────┬──────────┘  │
   │   │ feedback     │                  ensureStudentProfile  │             │
   │   │  submit      │                  (user-created hook)   ▼             │
   │   └──────────────┘                              ┌──────────────────┐    │
   │                                                 │ students         │    │
   │                                                 │  getStudent      │    │
   │                                                 │  ensureProfile   │    │
   │                                                 │  markPremiumInt. │    │
   │                                                 └──────────────────┘    │
   └─────────────────────────────────────────────────────────────────────────┘
                 all features ──► platform/db      purchases ──► platform/stripe
                                                   accounts  ──► platform/email
```

Dependency direction (no cycles):
`purchases → enrollment → accounts → students` and `purchases → courses`,
`progress → courses`, `enrollment → courses`. Nothing depends on `purchases`.

### 2.3 Modules

**purchases** — buying the course. The only module that talks to Stripe.
```ts
startCheckout(input: { courseId: CourseId; email: string } | { courseId: CourseId; userId: UserId })
  : Promise<{ kind: 'redirect'; url: string } | { kind: 'already_enrolled'; redirectTo: '/dashboard' }>
getCheckoutStatus(stripeSessionId: string)
  : Promise<{ state: 'processing' | 'paid' | 'not_paid'; next: 'check_email' | 'dashboard' | 'sign_in' }>
handleStripeEvent(rawBody: string, signature: string)
  : Promise<'processed' | 'already_processed' | 'ignored'>          // throws on bad signature
```
Uses: `courses.getOffer`, `enrollment.getCourseAccess / grant / revokeForPurchase`,
`accounts.provisionBuyer / sendAccessEmail`, platform/stripe.
Owns: `purchases`, `stripe_events`.
⚠ Price/amount/currency come from `courses.getOffer(courseId)` + the server's Stripe
Price ID env var; the client sends only `courseId` (+ `email` for guests).
⚠ Card-only Checkout → no delayed payment methods, so `async_payment_*` events never occur.

**accounts** — identity. Wraps Better Auth so no other module imports it directly.
```ts
auth                                                   // Better Auth instance (used by /api/auth/[...all])
getSession(): Promise<Session | null>
requireSession(): Promise<Session>                     // throws UnauthorizedError
provisionBuyer(email: string): Promise<{ userId: UserId; created: boolean; needsActivation: boolean }>
sendAccessEmail(userId: UserId, courseId: CourseId): Promise<void>  // activation link OR "sign in" email
requestActivation(email: string): Promise<void>        // resend; always resolves (no account-existence leak)
setInitialPassword(newPassword: string): Promise<void> // server action on /activate
```
Uses: `students.ensureStudentProfile` (Better Auth user-created hook), platform/email.
Owns: Better Auth tables `user`, `session`, `account`, `verification`.
⚠ `provisionBuyer` runs **before** the fulfillment transaction, not inside it: Better Auth's
`createUser` uses its own connection. It is idempotent and race-safe (unique email; a lost race
re-reads the winner), so a rollback after it only leaves an account that the retry reuses.
⚠ A password-reset request for a not-yet-activated account sends the activation link instead
(a reset alone would set a password without proving the email).

**enrollment** — access rules. The single answer to "can this user use this course?"
```ts
getCourseAccess(userId: UserId, courseId: CourseId): Promise<{ status: 'active' | 'none' }>
requireCourseAccess(courseId: CourseId): Promise<Session>               // throws Unauthorized/Forbidden
requireAnyEnrollment(): Promise<Session>                                 // dashboard gate
listEnrollments(userId: UserId): Promise<EnrollmentDTO[]>                // GET /api/enrollments
grant(tx: Tx, a: { userId: UserId; courseId: CourseId; purchaseId: string }): Promise<void>
revokeForPurchase(tx: Tx, purchaseId: string): Promise<void>
```
Uses: `accounts.requireSession`. Owns: `enrollments`.
⚠ Read from Postgres on every protected request (no per-user caching, Better Auth
cookie cache off), so a refund locks out an already-signed-in user on their next request.
This is also the interface the future Mux work plugs into (§5).

**courses** — catalog. No user data.
```ts
listCourses(): Promise<CourseDTO[]>
getCourse(courseId: CourseId): Promise<CourseDTO>          // throws NotFoundError
listLessons(courseId: CourseId): Promise<LessonsDTO>       // callers must check access first
getOffer(courseId: CourseId): Promise<{ courseId; amountCents: 39900; currency: 'usd'; stripePriceId: string }>
```
Owns: `courses`, `lessons`. Seed: `agentic-coding`, 0 lessons.

**progress**
```ts
getProgress(userId: UserId, courseId: CourseId): Promise<ProgressDTO>
markLessonComplete(userId: UserId, courseId: CourseId, lessonId: LessonId): Promise<ProgressDTO>
trackLessonAccess(userId: UserId, courseId: CourseId, lessonId: LessonId): Promise<void>
```
Uses: `courses.listLessons` (lesson belongs to course; total count). Owns: `lesson_progress`.

**students**
```ts
ensureStudentProfile(userId: UserId): Promise<void>          // idempotent
getStudent(userId: UserId): Promise<StudentDTO>
markPremiumInterest(userId: UserId, courseId: CourseId): Promise<EarlyAccessDTO>  // kept, unused (no seed)
```
Owns: `students`.

**feedback**
```ts
submitFeedback(userId: UserId, input: FeedbackInput): Promise<{ feedbackId: string }>
```
Owns: `feedback`.

**platform** (no business rules)
```ts
db, withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>         // platform/db
stripe, verifyWebhook(rawBody: string, signature: string): Stripe.Event // platform/stripe
sendEmail(msg: { to: string; subject: string; react: ReactElement }): Promise<void>  // platform/email
```

### 2.4 Which `app/` entry point calls which module

| Entry point | Calls |
|---|---|
| `/checkout` page + `startCheckout` action | `accounts.getSession`, `purchases.startCheckout` |
| `/checkout/success` + `GET /api/checkout/sessions/:id/status` | `purchases.getCheckoutStatus` |
| `POST /api/webhooks/stripe` | `purchases.handleStripeEvent` |
| `/api/auth/[...all]` | `accounts.auth` (sign-in, Google, sign-out, magic-link verify, password reset) |
| `/activate` + `setInitialPassword` action | `accounts.setInitialPassword` |
| `POST /api/activation/resend` | `accounts.requestActivation` |
| `/dashboard` page | `enrollment.requireAnyEnrollment`, `courses.listCourses` |
| `GET /api/enrollments` | `accounts.requireSession`, `enrollment.listEnrollments` |
| `GET /api/student`, early-access action | `accounts.requireSession`, `students.*` |
| `GET/POST /api/progress/*`, progress actions | `enrollment.requireCourseAccess`, `progress.*` |
| `GET /api/courses/:id/lessons` | `enrollment.requireCourseAccess`, `courses.listLessons` |
| `/course/[id]` page | `enrollment.requireCourseAccess`, `courses.getCourse` → "content coming soon" |
| feedback action | `accounts.requireSession`, `feedback.submitFeedback` |

---

## 3. Flows

### 3.1 Email buyer (guest)

Nothing is emailed and no account is created when checkout starts. Starting checkout
only writes a `pending` purchase row and opens Stripe.

```
Browser             app/                 purchases            accounts / enrollment       Stripe    SES
  │ enter email       │                      │                        │                     │        │
  ├──────────────────►│ startCheckout ──────►│ insert purchase        │                     │        │
  │                   │                      │  (pending, email)      │                     │        │
  │                   │                      │ create Checkout ───────┼────────────────────►│        │
  │◄── redirect to Stripe ───────────────────┤                        │                     │        │
  ├─────────────────────────── pays ─────────┼────────────────────────┼────────────────────►│        │
  │                   │◄────────── webhook: checkout.session.completed ┼─────────────────────┤        │
  │                   │ handleStripeEvent ──►│ ┌─ one DB transaction ─┐                     │        │
  │                   │                      │ │ dedupe event id      │                     │        │
  │                   │                      │ │ purchase → paid      │                     │        │
  │                   │                      │ │ provisionBuyer ─────►│ (see 3.3)           │        │
  │                   │                      │ │ grant ──────────────►│ enrollment active   │        │
  │                   │                      │ └─ commit ─────────────┘                     │        │
  │                   │                      │ sendAccessEmail ───────► activation link ────┼───────►│
  │                   │◄── 200 to Stripe ────┤                        │                     │        │
  │◄── Stripe redirects to /checkout/success; page polls status → "Check your email"        │        │
  │ click link ──────►│ /api/auth/magic-link/verify → email verified + signed in → /activate          │
  │ set password ────►│ setInitialPassword → /dashboard                                              │
```
⚠ The only SES send in this flow happens **after** payment is confirmed and committed.
⚠ If the browser closes after paying, nothing changes: the webhook alone does all of it.
⚠ If the email send fails, payment and enrollment stay. Recovery: "Resend activation
email" on the success page and `/signin` (links are minted fresh per send).

### 3.2 Google buyer

```
/checkout → Continue with Google → OAuth → back to /checkout?resume=agentic-coding (signed in)
  already enrolled? → /dashboard
  otherwise        → startCheckout({ courseId, userId }) → Stripe → webhook grants to that userId
                   → /checkout/success → status 'paid', next 'dashboard' → /dashboard
```
Signed-in but unpaid (Google) users hitting `/dashboard` are sent to `/checkout`.

### 3.3 Who gets the course? (identity resolution inside the webhook)

This runs inside the webhook, after Stripe has confirmed payment. The question it
answers: **which user account receives the enrollment?**

Why it's needed: for a guest, checkout start only records an *email*. We deliberately
don't create an account or check whether one exists at that point (that would let
anyone probe which emails have accounts, and "typing an email" must not create an
account). So the decision is deferred until we know the money is real.

```
Did the buyer start checkout while signed in (Google or returning user)?
 ├─ yes → purchase already carries their userId → enroll that user.
 └─ no (guest, only an email) → look up a user with that email:
       ├─ none                         → create user (unverified, no password) + student profile,
       │                                 enroll, email an ACTIVATION link.
       ├─ exists, never activated      → enroll, email an ACTIVATION link.
       └─ exists, already activated    → enroll, email "You're in — sign in with <email>".
```
Examples:
- Ana types `ana@x.com`, has never been here → new account, activation email.
- Ben signed up with Google last week but didn't pay. Today he checks out as a guest
  with the same email → the course goes to his existing Google account; he gets a
  "sign in" email. His account isn't overwritten or given a password.
- The `/checkout` page behaves identically in all three cases.

⚠ Google sign-in for an account that was created by a purchase but **not activated
yet** is refused by Better Auth (`account_not_linked`; it won't link Google to an
unverified account). `/signin` shows "Finish activating your account — resend link".
After activation, Google links automatically.

### 3.4 Refund (full refunds only)

```
purchase:    pending ──(paid)──► paid ──(refund succeeded)──► refunded
                 └──(session expired)──► expired

refund.created / refund.updated with status 'succeeded'
  → purchase → refunded
  → enrollment revoked, if the enrollment is backed by this purchase
```
- Refunds are issued from the Stripe Dashboard within the 30-day policy. Every refund is
  treated as full; we won't issue partial refunds.
- Account and progress are kept. Purchase history is kept.
- Repurchase after a refund creates a new purchase; `grant` re-activates the same
  enrollment row and points it at the new purchase.
- ⚠ Why the "backed by this purchase" check: a late or replayed refund event for the
  *old* purchase must not revoke access bought by the *new* one. That's the one
  rule that makes "stale events can't change access" hold.
- Payment events never move a purchase out of `refunded`.
- Paying twice: not handled specially. `grant` is idempotent, so the second payment just
  records a paid purchase; refund it from the Stripe Dashboard if asked.

### 3.5 Protected request

```
request ──► enrollment.requireCourseAccess(courseId)
              ├─ accounts.requireSession()     no session → 401 / redirect /signin
              └─ enrollments row active?       no → 403 / redirect /checkout
          ──► progress / courses service ──► Postgres
```

---

## 4. Data model

```
 accounts (Better Auth)        students              courses ──1:*── lessons (PK course_id+lesson_id)
 user ─┬─ session              students(user_id PK)
       ├─ account
       └─ verification

 purchases                                   enrollments
  id, email, user_id (null until paid)        UNIQUE(user_id, course_id)
  course_id, amount_cents, currency           status: active | revoked
  status: pending|paid|expired|refunded       purchase_id ──► purchases.id
  stripe_checkout_session_id UNIQUE           granted_at, revoked_at
  stripe_payment_intent_id   UNIQUE
  stripe_refund_id, refunded_at              stripe_events (event_id PK, type, processed_at)

 lesson_progress  PK(user_id, course_id): completed_lesson_ids[], last_accessed_lesson_id, updated_at
 feedback         id, user_id, feedback, category, rating, created_at
```
Stack: better-auth 1.7.7 (admin + magic-link plugins), drizzle-orm 0.45 / drizzle-kit 0.31,
@neondatabase/serverless 1.2 with the **Pool (WebSocket) driver** — the HTTP driver can't
run the webhook's transaction — and stripe 23.0.0 (API `2026-09-30.endive`).

Activation uses only supported Better Auth APIs: admin `createUser` (no password),
magic-link `signInMagicLink` (server-side; its public route disabled) → `/magic-link/verify`
(single-use, sets `emailVerified`) → `setPassword` (server-only). Email/password self-sign-up
is disabled.

---

## 5. REST contract review

| Current | Decision |
|---|---|
| `GET /api/courses`, `GET /api/courses/:id` | **Keep** (public). `pricingModel: 'paid'`, `price: 399`. |
| `GET /api/courses/:id/lessons` | **Change**: requires enrollment (403). |
| `GET /api/courses/:id/video-access`, `GET /api/lessons/:id/video-url` | **Remove** (CloudFront; Mux later). |
| `POST /api/enrollments` (free enroll) | **Remove**. Enrollment only comes from payment. |
| `GET /api/enrollments` | **Change** shape → `{ courseId, status: 'active', enrolledAt }[]`. Card progress bars come from `/api/progress`, so nothing visible is lost. |
| `GET /api/enrollments/check/:courseId` | **Remove** (internal `getCourseAccess`). |
| `GET /api/progress/:courseId`, `POST /api/progress`, `POST /api/progress/access` | **Keep** shapes; add enrollment check + "lesson belongs to course". |
| `GET /api/students/me` | **Keep**; `userId` is now the Better Auth id. `signedUpMeetups` dropped. |
| `PATCH /api/students/me` | **Remove** (unused). |
| `POST /api/students/early-access` | **Keep** code, dormant (no coming-soon course seeded). |
| `GET /api/meetups`, `POST /api/meetups/:id/signup` | **Remove** with the dashboard meetups UI (Office Hours later). |
| `POST /api/feedback` | **Keep**. |
| new `POST /api/checkout/sessions` `{courseId, email?}` | → `{ url }` or `{ redirectTo: '/dashboard' }` |
| new `GET /api/checkout/sessions/:id/status` | → `{ state, next }`, no personal data |
| new `POST /api/webhooks/stripe` | raw body + signature |
| new `POST /api/activation/resend` `{email}` | always `202` |
| new `/api/auth/*` | Better Auth |

Pages: new `/checkout`, `/checkout/success`, `/activate`, `/forgot-password`, `/reset-password`;
rebuilt `/signin`; removed `/enroll`, `/verify-email`.

---

## 6. Future video hook (reserved, not built here)

```ts
// features/courses (or a future features/playback)
getLessonPlayback(userId, courseId, lessonId): Promise<{ provider: 'mux'; playbackId; token; expiresAt }>
// GET /api/courses/:courseId/lessons/:lessonId/playback  — behind enrollment.requireCourseAccess
```
Mux adds a lesson column and this endpoint. Purchases and enrollment don't change.

---

## 7. Decisions log

- D1 Enrollment DTO slimmed — accepted.
- D2 Meetups removed (UI + backend); Office Hours is a later feature.
- D3 Early-access code kept, not seeded.
- D4 Duplicate payments not handled; refund manually.
- D5 No partial refunds; every refund is full and revokes access.
- Email sending is best-effort after commit, with a resend button as the recovery path
  (no outbox table or cron in the MVP).
- Google is not a Better Auth "trusted provider": linking needs Google's email_verified AND an
  activated local account (trusting Google would link unverified Google emails).
- The CloudFront video player (VideoPlayer, CourseVideoSection, hls.js) was removed; lesson list
  and sidebar components remain for the Mux work.
- Sign-out clears the SWR cache so the next user in the same tab never sees cached user data.
