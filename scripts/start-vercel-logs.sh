#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$SCRIPT_DIR/.vercel-logs.pid"
LOG_FILE="$SCRIPT_DIR/.vercel-logs.log"

# Check if already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo "⚠️  Vercel logs are already running (PID: $OLD_PID)"
    echo "Run 'pnpm run logs:stop' to stop them first"
    exit 1
  else
    # Stale PID file, remove it
    rm "$PID_FILE"
  fi
fi

# Read the preview URL from e2e/.env
ENV_FILE="$PROJECT_ROOT/e2e/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE not found"
  echo "Run './scripts/deploy-preview-frontend.sh' first to create a preview deployment"
  exit 1
fi

PREVIEW_URL=$(grep "^BASE_URL=" "$ENV_FILE" | cut -d'=' -f2)

if [ -z "$PREVIEW_URL" ]; then
  echo "❌ Error: BASE_URL not found in $ENV_FILE"
  echo "Run './scripts/deploy-preview-frontend.sh' first to create a preview deployment"
  exit 1
fi

echo "📡 Starting Vercel logs for: $PREVIEW_URL"
echo "📄 Logs will be available for the AI agent to monitor"
echo ""

# Start vercel logs in the background
cd "$PROJECT_ROOT"
nohup vercel logs "$PREVIEW_URL" --follow > "$LOG_FILE" 2>&1 &
VERCEL_PID=$!

# Save the PID
echo "$VERCEL_PID" > "$PID_FILE"

echo "✅ Vercel logs started (PID: $VERCEL_PID)"
echo "📝 Logs are being written to: $LOG_FILE"
echo "🛑 Stop with: pnpm run logs:stop"
