#!/usr/bin/env bash
# Smoke-test a deployed environment.
#   ./scripts/smoke.sh <url>              read-only checks (safe for production)
#   ./scripts/smoke.sh <url> --purchase   + sandbox purchase; forwards sandbox webhooks to <url> while it runs
# Protected previews: export VERCEL_AUTOMATION_BYPASS_SECRET first.
set -euo pipefail
cd "$(dirname "$0")/.."
url="${1:?usage: smoke.sh <url> [--purchase]}"; url="${url%/}"
export SMOKE_URL="$url"

if [[ "${2:-}" == "--purchase" ]]; then
  if [[ "$url" =~ learnwithrico\.com ]]; then echo "Refusing to make a purchase against production ($url)" >&2; exit 1; fi
  key="$(grep '^STRIPE_SECRET_KEY=' .env.local | cut -d= -f2-)"
  [[ "$key" == sk_test_* || "$key" == rk_test_* ]] || { echo "Sandbox STRIPE_SECRET_KEY required in .env.local" >&2; exit 1; }
  headers=()
  [[ -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ]] && headers=(--headers "x-vercel-protection-bypass:${VERCEL_AUTOMATION_BYPASS_SECRET}")
  log="$(mktemp)"
  stripe listen --api-key "$key" --events checkout.session.completed,checkout.session.expired,refund.created,refund.updated \
    --forward-to "${url}/api/webhooks/stripe" "${headers[@]}" >"$log" 2>&1 &
  listener=$!
  trap 'kill $listener 2>/dev/null || true' EXIT
  for _ in $(seq 1 30); do grep -q "Ready!" "$log" && break; sleep 1; done
  grep -q "Ready!" "$log" || { cat "$log" >&2; exit 1; }
  export SMOKE_PURCHASE=1
fi

pnpm exec playwright test --config playwright.smoke.config.ts
