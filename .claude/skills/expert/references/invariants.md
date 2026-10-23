# Invariants — hard rules the codebase upholds

Hard = mechanically checkable, pass/fail, no judgment (contrast `patterns.md`, which
is soft taste). Each was verified to hold with **0 violations** at bootstrap. The
highest-value ones are promoted to enforced lints in `scripts/lints/` (wired into
`scripts/local-checks.sh §5`, which auto-runs the whole dir). The rest are recorded
as prose with a check command and **promoted to a lint on recurrence** (the discipline:
one occurrence is a pattern; repetition across merges is an enforceable invariant).

## Enforced (lint exists today)

| Rule | Why | Lint |
|---|---|---|
| **Frontend never imports a DynamoDB/AWS DB client.** All persistence goes through the backend HTTP API. | UI layer must not couple to the data store or bypass backend authz/validation. | `scripts/lints/no-frontend-db.sh` |
| **No `console.*` in `backend/src` app code** — use `createLogger()`. | Lambda/CloudWatch consume structured JSON; `console` breaks log queries + metric correlation. | `scripts/lints/no-console-backend.sh` |
| **`frontend/` never imports from `backend/`** (package boundary). | Two independent deployables (Vercel vs Lambda); the only contract is the HTTP API. A source import drags server/Node code into the client bundle. | `scripts/lints/frontend-no-backend-import.sh` |
| **Every `frontend/app/actions/*.ts` starts with `'use server'`.** | Without it the bundler can pull server-only code (and id_token handling) into the client bundle — a secret/privilege boundary failure. | `scripts/lints/server-actions-use-server.sh` |

## Recorded — prose now, candidate lint on recurrence

Each holds at 0 violations today; the `check` is the grep a future `/learn` (or a
human) promotes into `scripts/lints/` if the rule recurs or is deliberately enforced.

- **ES modules only — no CommonJS `require()` in app code.** `backend` is `"type":
  "module"`. WHY: a stray `require()` breaks the NodeNext resolver.
  `check:` `grep -rnE '\brequire\(' backend/src frontend --include='*.ts' --include='*.tsx' --exclude-dir=node_modules | grep -vE '\.test\.|__tests__|__integration__'`
- **All DynamoDB access funneled through `*.repository.ts`** (+ the shared
  `backend/src/lib/dynamodb.ts`, + the standalone `src/lambdas/student-onboarding.ts`).
  No `*.service.ts`/`*.routes.ts` imports the Dynamo SDK. WHY: one swappable storage
  layer; marshalling config lives in one place. (Lint needs an allowlist for those 3 paths.)
- **Backend relative imports carry the `.js` extension** (NodeNext ESM). WHY: required
  at runtime under `"type": "module"`.
  `check:` `grep -rnE "from '(\.\.?/)[^']*'" backend/src --include='*.ts' | grep -vE "\.(js|json)'"`
- **No `as any` casts in `backend/src` app code.** WHY: preserves end-to-end type
  safety. (Frontend has exactly one, `frontend/proxy.ts` `auth(request as any)`, so the
  enforceable cut is backend-only.)
- **Client components reference only `NEXT_PUBLIC_*` env (and `NODE_ENV`).** WHY: a
  server-only env var in a client component is `undefined` at runtime or leaks a secret.
- **Every backend feature router is registered in `backend/src/app.ts`.** WHY: one place
  to see the full URL surface; no orphan route files. (Needs an `ls`-vs-`app.ts` diff, not a pure grep.)

## The non-bypassable backbone (not lints — process invariants)

- **`run-prd-test.sh` exit 0 is the definition of done.** No PR merges without it.
- **Silencing a check is bypassing it.** New suppression directives (`@ts-ignore`,
  `eslint-disable`, `as`/`!`), weakened configs, and added test skips are a human's
  deliberate call on the branch — never an agent's. A green gate reached by silencing
  is a regression in disguise.
