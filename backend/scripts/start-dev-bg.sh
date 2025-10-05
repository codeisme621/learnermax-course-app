#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$BACKEND_DIR/.local-dev.log"
PID_FILE="$BACKEND_DIR/.local-dev.pid"

# Check if already running
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p $PID > /dev/null 2>&1; then
    echo "⚠️  Backend dev server is already running (PID: $PID)"
    echo "📝 Logs: $LOG_FILE"
    exit 1
  else
    # Clean up stale PID file
    rm -f "$PID_FILE"
  fi
fi

echo "🚀 Starting backend dev server in background..."

# Start the dev server in background and redirect output to log file
cd "$BACKEND_DIR"
nohup pnpm run dev > "$LOG_FILE" 2>&1 &
DEV_PID=$!

# Save PID
echo $DEV_PID > "$PID_FILE"

echo "✅ Backend dev server started (PID: $DEV_PID)"
echo "🌐 Server running on: http://localhost:8080"
echo "📝 Logs are being written to: $LOG_FILE"
echo "🛑 Stop with: pnpm run dev:stop"
