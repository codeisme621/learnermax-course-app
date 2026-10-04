#!/usr/bin/env bash
# Pull local-development secrets into frontend/.env.local without ever printing a value.
#
#   Google OAuth   ← AWS Secrets Manager: learnermax/google-oauth
#   Stripe (test)  ← AWS Secrets Manager: learnermax/stripe   (test-mode keys only; live keys are refused)
#   Stripe webhook ← `stripe listen --print-secret` (the signing secret for local CLI forwarding),
#                    authenticated with the sandbox key above so an expired `stripe login` doesn't matter
#
# Usage (from frontend/):  ./scripts/pull-local-secrets.sh
# Requires: aws (credentials with secretsmanager:GetSecretValue), jq, stripe CLI.
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=".env.local"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

for bin in aws jq stripe; do
  command -v "$bin" >/dev/null || { echo "Missing required command: $bin" >&2; exit 1; }
done

# Replace KEY=... in .env.local, or append it. The value never reaches stdout.
set_env() {
  local key="$1" value="$2"
  if [[ -z "$value" ]]; then
    echo "  ✗ $key: no value found" >&2
    return 1
  fi
  local tmp
  tmp="$(mktemp)"
  grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "  ✓ $key set"
}

secret_json() {
  aws secretsmanager get-secret-value --secret-id "$1" --query SecretString --output text
}

echo "Google OAuth (learnermax/google-oauth)"
google="$(secret_json learnermax/google-oauth)"
echo "  keys in secret: $(jq -r 'keys | join(", ")' <<<"$google")"
set_env GOOGLE_CLIENT_ID "$(jq -r '.client_id // .clientId // .GOOGLE_CLIENT_ID // empty' <<<"$google")"
set_env GOOGLE_CLIENT_SECRET "$(jq -r '.client_secret // .clientSecret // .GOOGLE_CLIENT_SECRET // empty' <<<"$google")"

echo "Stripe (learnermax/stripe)"
stripe_json="$(secret_json learnermax/stripe)"
echo "  keys in secret: $(jq -r 'keys | join(", ")' <<<"$stripe_json")"
# Pick values by prefix so the secret's key names don't matter.
first_with_prefix() { jq -r --arg p "$1" '[.[] | strings | select(startswith($p))][0] // empty' <<<"$stripe_json"; }
if [[ -n "$(first_with_prefix sk_live_)$(first_with_prefix rk_live_)" ]]; then
  echo "  ! secret also contains LIVE keys — ignored; local development uses test mode only"
fi
stripe_secret="$(first_with_prefix sk_test_)"
[[ -n "$stripe_secret" ]] || stripe_secret="$(first_with_prefix rk_test_)"
set_env STRIPE_SECRET_KEY "$stripe_secret"

key_account="$(curl -s https://api.stripe.com/v1/account -u "${stripe_secret}:" | jq -r '.id // empty')"
echo "  ✓ sandbox account: ${key_account:-unknown}"

echo "Stripe webhook signing secret (stripe listen)"
# Same key as the app, so `stripe listen` forwards events from exactly the account the app charges.
set_env STRIPE_WEBHOOK_SECRET "$(stripe listen --api-key "$stripe_secret" --print-secret 2>/dev/null)"

echo
echo "Done. Keys now in $ENV_FILE: $(grep -oE '^[A-Z_]+' "$ENV_FILE" | sort | tr '\n' ' ')"
