#!/usr/bin/env bash
# server-actions-use-server.sh — server-action safety invariant.
#
# INVARIANT: every module in frontend/app/actions/*.ts begins with the 'use server'
# directive. Verified 0 violations at bootstrap (auth, enrollments, feedback,
# meetups, progress, students).
#
# WHY: these modules hold server-only logic and reach the backend with the Cognito
# ID token sourced server-side. Without the directive at the top of the file, the
# bundler may pull the code (and its secret handling) into the CLIENT bundle — a
# real data-leak / privilege boundary failure, not a style nit.
# Exit 0 = clean. Exit 1 = a violation with a remediation message.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIR="$ROOT/frontend/app/actions"

[[ -d "$DIR" ]] || { echo "server-actions-use-server: OK (no actions dir)"; exit 0; }

bad=()
for f in "$DIR"/*.ts; do
  [[ -e "$f" ]] || continue
  # First non-empty line must be a "use server" directive (single or double quotes).
  first="$(grep -m1 -vE '^[[:space:]]*$' "$f" | tr -d '[:space:]')"
  case "$first" in
    "'useserver';"|'"useserver";'|"'useserver'"|'"useserver"') : ;;
    *) bad+=("$f") ;;
  esac
done

if (( ${#bad[@]} )); then
  echo "❌ server-actions-use-server: action module(s) missing the 'use server' directive:" >&2
  printf '   %s\n' "${bad[@]}" >&2
  cat >&2 <<'EOF'
   WHY: without 'use server' at the top of the file, the bundler can pull this
        server-only code (and its ID-token handling) into the CLIENT bundle — a
        privilege/secret boundary failure, not a style nit.
   FIX: make the FIRST line of the file exactly:  'use server'
   Don't move the logic into a component to dodge this — keep mutations in
        frontend/app/actions/* with the directive.
EOF
  exit 1
fi
echo "server-actions-use-server: OK"
