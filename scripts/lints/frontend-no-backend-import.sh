#!/usr/bin/env bash
# frontend-no-backend-import.sh — package-boundary invariant.
#
# INVARIANT: no file under frontend/ imports from backend/ (the two are separate
# deployables — Vercel vs AWS Lambda — and their ONLY contract is the HTTP API).
# Verified 0 violations at bootstrap.
#
# WHY: reaching into backend/ source from the frontend couples two independently
# deployed packages, drags server-only/Node code into the client bundle, and
# bypasses the HTTP API contract (auth, validation). Talk to the backend over HTTP.
# Exit 0 = clean. Exit 1 = a violation with a remediation message.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Match imports whose specifier resolves into the sibling backend/ package.
hits="$(grep -rnE "from ['\"]([./]*/)*backend/|require\(['\"]([./]*/)*backend/" "$ROOT/frontend" \
          --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
          --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=coverage 2>/dev/null || true)"

if [[ -n "$hits" ]]; then
  echo "❌ frontend-no-backend-import: frontend/ imports from backend/." >&2
  echo "$hits" | sed 's/^/   /' >&2
  cat >&2 <<'EOF'
   WHY: frontend (Vercel) and backend (AWS Lambda) are separate deployables; their
        only contract is the HTTP API. A source import couples them and can pull
        server-only code into the client bundle.
   FIX: call the backend over HTTP instead (frontend/lib/data/* server fetchers,
        frontend/app/actions/* server actions, or the BFF route handlers in
        frontend/app/api/*). Share types by duplicating the shape, not importing it.
   Don't silence with a path alias — that hides the same cross-package edge.
EOF
  exit 1
fi
echo "frontend-no-backend-import: OK"
