#!/usr/bin/env bash
# Forward sandbox webhooks to the local app. Authenticates with STRIPE_SECRET_KEY from .env.local
# (the same account the app charges), so an expired `stripe login` doesn't matter.
#   pnpm stripe:listen            → http://localhost:3000
#   pnpm stripe:listen 3100       → http://localhost:3100 (Playwright's server)
set -euo pipefail
cd "$(dirname "$0")/.."
port="${1:-3000}"
key="$(grep '^STRIPE_SECRET_KEY=' .env.local | cut -d= -f2-)"
[[ -n "$key" ]] || { echo "STRIPE_SECRET_KEY missing from .env.local (run ./scripts/pull-local-secrets.sh)" >&2; exit 1; }
exec stripe listen --api-key "$key" \
  --events checkout.session.completed,checkout.session.expired,refund.created,refund.updated \
  --forward-to "localhost:${port}/api/webhooks/stripe"
