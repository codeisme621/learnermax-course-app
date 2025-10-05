#!/bin/bash

# Usage: ./tail-logs.sh <preview|prod>
ENV=${1:-preview}

if [ "$ENV" != "preview" ] && [ "$ENV" != "prod" ]; then
  echo "Error: Environment must be 'preview' or 'prod'"
  echo "Usage: ./tail-logs.sh <preview|prod>"
  exit 1
fi

STACK_NAME="learnermax-course-app-$ENV"

echo "Tailing logs for stack: $STACK_NAME"
echo "Press Ctrl+C to stop"
echo "---"

sam logs --stack-name "$STACK_NAME" --tail
