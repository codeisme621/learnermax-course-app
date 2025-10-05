#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Deploying frontend to Vercel preview environment..."

# Deploy to Vercel and capture the preview URL
cd "$PROJECT_ROOT"
PREVIEW_URL=$(vercel --yes)

echo "✅ Deployment successful!"

# Update e2e/.env with the preview URL
echo "📝 Updating e2e/.env with preview URL..."

# Preserve existing env vars and update BASE_URL
if [ -f e2e/.env ]; then
  # Remove any existing BASE_URL line and append the new one
  grep -v "^BASE_URL=" e2e/.env > e2e/.env.tmp 2>/dev/null || true
  echo "BASE_URL=$PREVIEW_URL" >> e2e/.env.tmp
  mv e2e/.env.tmp e2e/.env
else
  # Create new .env file with BASE_URL
  echo "BASE_URL=$PREVIEW_URL" > e2e/.env
fi

echo ""
echo "🎉 Preview deployment complete!"
echo ""
echo "Preview URL: $PREVIEW_URL"
echo ""
echo "The e2e tests have been configured to use this preview URL."
echo "Run 'cd e2e && pnpm test' to test against the preview environment."
