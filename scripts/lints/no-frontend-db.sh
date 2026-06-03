#!/usr/bin/env bash
# no-frontend-db.sh — structural invariant lint.
#
# INVARIANT (architecture rule, see CLAUDE.md): the frontend NEVER accesses the
# database directly. It calls backend API endpoints / server actions; all DynamoDB
# access lives in backend/. This lint blocks any import of a DynamoDB / AWS DB
# client from under frontend/, so the layer boundary can't silently erode.
#
# Evidenced: passes clean against current main (frontend/ imports no DB client).
# Exit 0 = clean. Exit 1 = a violation, with a remediation-aware message.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Match imports/requires of DynamoDB or AWS DB SDK clients. The match is a proxy
# for "frontend reaches the DB directly"; the cheap way to satisfy it (don't import
# a DB client in the frontend) is also the correct way.
PATTERN='@aws-sdk/client-dynamodb|@aws-sdk/lib-dynamodb|DynamoDBClient|DynamoDBDocumentClient|\baws-sdk\b.*[Dd]ynamo'

# Scan frontend source only; skip vendored/build/test-output dirs.
hits="$(grep -rnE "$PATTERN" "$ROOT/frontend" \
          --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
          --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=coverage \
          --exclude-dir=dist --exclude-dir=build 2>/dev/null || true)"

if [[ -n "$hits" ]]; then
  echo "❌ no-frontend-db: the frontend must not access the database directly." >&2
  echo "$hits" | sed 's/^/   /' >&2
  cat >&2 <<'EOF'
   WHY: frontend/ is the UI layer; all DynamoDB access belongs in backend/ behind
        an API. A direct DB import couples the UI to the data store and the AWS SDK,
        and bypasses the backend's validation/authz.
   FIX: move the data access into a backend endpoint and call it from the frontend
        (see frontend/lib/fetchers.ts / frontend/app/actions/* for the pattern).
   Don't silence with an eslint-disable or a re-export alias — that hides the same
   cross-layer edge. If this truly must change, it's a human architecture decision.
EOF
  exit 1
fi

echo "no-frontend-db: OK"
