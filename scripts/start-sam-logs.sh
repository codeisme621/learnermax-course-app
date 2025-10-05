#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.sam-logs.pid"
LOG_FILE="$SCRIPT_DIR/.sam-logs.log"

# Hardcoded to preview environment
ENV="preview"

# Check if already running
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if ps -p "$OLD_PID" > /dev/null 2>&1; then
    echo "⚠️  SAM logs are already running (PID: $OLD_PID)"
    echo "Run 'pnpm run logs:stop' to stop them first"
    exit 1
  else
    # Stale PID file, remove it
    rm "$PID_FILE"
  fi
fi

STACK_NAME="learnermax-course-app-$ENV"

echo "📡 Starting SAM logs for stack: $STACK_NAME"
echo "📄 Logs will be available for the AI agent to monitor"
echo ""

# Start sam logs in the background
nohup sam logs --stack-name "$STACK_NAME" --tail > "$LOG_FILE" 2>&1 &
SAM_PID=$!

# Save the PID
echo "$SAM_PID" > "$PID_FILE"

echo "✅ SAM logs started (PID: $SAM_PID)"
echo "📝 Logs are being written to: $LOG_FILE"
echo "🛑 Stop with: pnpm run logs:stop"
