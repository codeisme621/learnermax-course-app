#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$BACKEND_DIR/.local-dev.log"
PID_FILE="$BACKEND_DIR/.local-dev.pid"

# Check if PID file exists
if [ ! -f "$PID_FILE" ]; then
  echo "⚠️  No backend dev server running (PID file not found)"
  exit 0
fi

PID=$(cat "$PID_FILE")

# Check if process is running
if ! ps -p $PID > /dev/null 2>&1; then
  echo "⚠️  Backend dev server not running (stale PID: $PID)"
  rm -f "$PID_FILE"
  rm -f "$LOG_FILE"
  exit 0
fi

echo "🛑 Stopping backend dev server (PID: $PID)..."
kill $PID

# Wait for process to terminate
sleep 1

# Force kill if still running
if ps -p $PID > /dev/null 2>&1; then
  echo "⚠️  Process still running, force killing..."
  kill -9 $PID 2>/dev/null || true
fi

echo "✅ Backend dev server stopped"
echo "🧹 Cleaning up log and PID files"

rm -f "$PID_FILE"
rm -f "$LOG_FILE"
