#!/usr/bin/env bash
# Compare paid Stripe checkouts with the app's purchases, on a deployed environment (read-only).
#   OPS_SECRET=… ./scripts/ops-reconcile.sh https://www.learnwithrico.com [days]
# Exit code 1 when anything needs attention.
set -euo pipefail
url="${1:?usage: ops-reconcile.sh <base-url> [days]}"; days="${2:-30}"
: "${OPS_SECRET:?set OPS_SECRET (the value stored in Vercel for that environment)}"
extra=()
[[ -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ]] && extra=(-H "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET}")
report="$(curl -fsS "${extra[@]}" -H "Authorization: Bearer ${OPS_SECRET}" "${url%/}/api/ops/reconcile?days=${days}")"
echo "$report" | jq -r '"Checked \(.checkedSessions) paid checkouts in the last \(.days) days: \(.ok) ok, \(.findings | length) need attention"'
echo "$report" | jq -r '.findings[] | "  ✗ \(.kind)  session=\(.sessionId)  purchase=\(.purchaseId // "-")  — \(.detail)"'
[[ "$(echo "$report" | jq '.findings | length')" == "0" ]]
