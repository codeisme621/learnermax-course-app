# Verification — how features get tested/verified here

The cheapest layer that can catch a problem should. Order, cheapest → most expensive.

## The deterministic gate: `scripts/local-checks.sh`

Run from repo root before opening a PR (the harness runs it automatically). `set -uo
pipefail` (not `-e`) so all checks run and aggregate. In order:

1. **Lint** (block) — `pnpm run lint` in `backend`, `frontend`, `e2e` (eslint).
2. **Typecheck** (block) — `pnpm run typecheck` (`tsc --noEmit`) in all three.
3. **Fast unit tests** (block) — `pnpm run test:unit` in `backend` + `frontend` only.
4. **Skip-detection** (block) — fails if the branch diff ADDS `.skip`/`.only`/`xit`/etc.
5. **Custom invariant lints** (block) — every `scripts/lints/*.sh` (see `invariants.md`).
6. **AGENTS.md freshness** (advisory/warn-only for now — see `invariants.md`).

`./scripts/local-checks.sh fix` runs `eslint --fix` across the workspaces.
Integration + e2e are deliberately NOT in this gate (too slow / need real infra).

## Backend tests (`backend/jest.config.js` — two projects)

- **unit** (`pnpm test:unit`): `**/__tests__/**/*.test.ts`, `node` env, ts-jest ESM,
  **AWS mocked** via `aws-sdk-client-mock`. 80% coverage threshold; `collectCoverageFrom`
  excludes `*.types.ts`/`*.repository.ts`/`*.interface.ts`. This is the suite the gate runs.
- **integration** (`pnpm test:integration`): `**/__integration__/**/*.integration.test.ts`,
  **hits REAL preview DynamoDB**. `src/__integration__/setup.ts` loads `backend/.env.integration`
  (create from `.env.integration.example`) and runs `validateTestEnvironment()` —
  a safety guard that **refuses any table name not containing `preview`/`test`/`dev`**.
  Needs AWS creds. `--runInBand`, 30s timeout.

## Frontend tests (`frontend/jest.config.js` — two projects)

- **unit** (`pnpm test:unit`): jsdom, `@swc/jest`, tests in `__tests__/`. `jest.setup.js`
  mocks `next-auth`, `next/navigation`, the `app/actions/auth` module, analytics.
- **integration** (`pnpm test:integration`): **MSW** (`msw/node`) mocks the backend at
  the network layer (`app/actions/__integration__/{setup,handlers}.ts`); covers full
  client flows (dashboard, course, auto-resume, upsell) against the mocked API.
  `jest.polyfills.js` provides the MSW v2 + undici fetch polyfills.

## E2E (`e2e/`, Playwright)

- `api` project: hits `API_URL` with `x-api-key`. `ui` project: drives `BASE_URL` in
  Chrome, asserting rendering (it does NOT complete a real Google sign-in / paid enroll).
- Runs against a **deployed Vercel preview** (the `webServer` block is disabled), with
  `x-vercel-protection-bypass` from `VERCEL_AUTOMATION_BYPASS_SECRET`.

## Running the app locally + reading signals

- Background dev per workspace: `pnpm run dev:bg` (→ `nohup pnpm dev`), `dev:stop`,
  `dev:logs` (`cat .local-dev.log`). Backend :8080, frontend :3000.
- Deploy a preview + tail logs: `scripts/deploy-preview-{backend,frontend}.sh`, then
  `scripts/start-{sam,vercel}-logs.sh` → read `scripts/.{sam,vercel}-logs.log` → act →
  `stop-*-logs.sh`. (`scripts/README.md` documents the agent workflow.)

## CI / hooks status

There is **no test/build CI and no git hooks**. The only GitHub Actions workflow is
`.github/workflows/claude-review.yml` — the one-way Claude PR reviewer (per `REVIEW.md`).
So `local-checks.sh` + the PRD runner carry the deterministic weight before merge.

## What "done" means

A change is done when `./prds/<feature>/run-prd-test.sh` exits 0 (the runnable
definition of done) **and** `local-checks.sh` passes. Heavier layers (integration,
e2e, deploy) are run deliberately, not on every gate.
