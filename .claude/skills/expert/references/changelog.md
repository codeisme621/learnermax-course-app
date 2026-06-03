# Changelog — Expert provenance

What `/learn` changed, when, why, and the consensus behind it. Newest first.

## 2026-06-03 — Bootstrap (`/learn --rebuild`), base `main@0a7e1ae`

**Mode:** bootstrap (no prior Expert). Memory seeded from a full scan of committed
code on `main`, not a diff.

**Consensus:** four parallel codebase analyzers (backend, frontend, verification,
invariants) independently scanned the tree; agreement across agents on the same rules
— each invariant cross-confirmed with a 0-violation count against current `main` —
served as the consensus gate for this from-scratch seed. Every promoted lint was run
against `main` and passes (the must-pass-current-main discriminator).

**Surfaces written:**
- `SKILL.md` + all reference shards: `architecture.md`, `core-files.md`,
  `verification.md`, `patterns.md`, `invariants.md`, `procedural.md`.
- **Invariants → lints (4 enforced).** `no-frontend-db.sh` (pre-existing, from
  `/harness-init`) + 3 new: `no-console-backend.sh`, `frontend-no-backend-import.sh`,
  `server-actions-use-server.sh`. All under `scripts/lints/`, auto-run by
  `local-checks.sh §5`. Each is a 1-line-grep, structural/security rule, 0 violations.
- **Invariants → prose (6 candidates).** ES-modules-only, DynamoDB-only-via-repository,
  backend `.js`-import-extension, no-`as any`-in-backend, client-only-`NEXT_PUBLIC_*`-env,
  all-routers-registered-in-app.ts — recorded with check commands; promote to lints on
  recurrence or by human decision.

**Not changed:** root `AGENTS.md` left as-is (its Expert pointer now resolves since
`.claude/skills/expert/` exists; its remaining `check-agents-md.sh` warnings are the
known slash-command/`<f>`-token false positives, so the freshness lint stays advisory
in `local-checks.sh §6` — promote to blocking once those are reconciled).

**Note on scope:** this is *snapshot* discovery (the code as it is, one time). Future
`/learn` runs do *stream* discovery over merged diffs and may promote the prose
candidates above as they recur.
