#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.vercel-logs.pid"
LOG_FILE="$SCRIPT_DIR/.vercel-logs.log"

if [ ! -f "$PID_FILE" ]; then
  echo "⚠️  No Vercel logs process found"
  exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
  echo "🛑 Stopping Vercel logs (PID: $PID)..."
  kill "$PID"
  rm "$PID_FILE"
  echo "✅ Vercel logs stopped"
else
  echo "⚠️  Process $PID is not running"
  rm "$PID_FILE"
fi

# Clean up log file
if [ -f "$LOG_FILE" ]; then
  echo "🧹 Cleaning up log file"
  rm "$LOG_FILE"
fi
