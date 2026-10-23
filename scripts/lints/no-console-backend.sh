#!/usr/bin/env bash
# no-console-backend.sh — structured-logging invariant (backend).
#
# INVARIANT: backend application code (backend/src, excluding tests) never calls
# console.*; all logging goes through createLogger() from backend/src/lib/logger.ts
# (wraps @aws-lambda-powertools/logger). Verified 0 violations at bootstrap.
#
# WHY: this backend runs in AWS Lambda; CloudWatch + the Powertools logger consume
# STRUCTURED JSON logs with a service name and request context. A bare console.*
# emits unstructured output that breaks log queries and metric correlation.
# Exit 0 = clean. Exit 1 = a violation with a remediation message.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# App code only: exclude tests/integration helpers, which legitimately use console.
hits="$(grep -rnE 'console\.(log|error|warn|info|debug)' "$ROOT/backend/src" \
          --include='*.ts' --include='*.js' --exclude-dir=node_modules 2>/dev/null \
        | grep -vE '\.test\.|/__tests__/|/__integration__/' || true)"

if [[ -n "$hits" ]]; then
  echo "❌ no-console-backend: console.* in backend app code — use the structured logger." >&2
  echo "$hits" | sed 's/^/   /' >&2
  cat >&2 <<'EOF'
   WHY: Lambda/CloudWatch consume structured JSON logs; console.* is unstructured
        and breaks log queries + metric correlation.
   FIX: const logger = createLogger('<ModuleName>')  (from backend/src/lib/logger.ts),
        then logger.info/.error(msg, { ...context }). Emit metrics via createMetrics().
   Don't silence with an eslint-disable — the log still ships unstructured.
EOF
  exit 1
fi
echo "no-console-backend: OK"
