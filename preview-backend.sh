#!/bin/bash

# Get the preview stack outputs
echo "Getting preview backend API endpoint and API key..."

# Get API endpoint from CloudFormation stack outputs
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name learnermax-course-app-preview \
  --query 'Stacks[0].Outputs[?OutputKey==`WebEndpoint`].OutputValue' \
  --output text)

# Get API Key ID from CloudFormation stack outputs
API_KEY_ID=$(aws cloudformation describe-stacks \
  --stack-name learnermax-course-app-preview \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiKeyId`].OutputValue' \
  --output text)

# Get the actual API key value
API_KEY=$(aws apigateway get-api-key \
  --api-key $API_KEY_ID \
  --include-value \
  --query 'value' \
  --output text)

echo "API Endpoint: $API_ENDPOINT"

# Update the e2e/.env file
E2E_ENV_FILE="/home/rico/projects/learnermax-course-app/e2e/.env"

# Remove old API_URL and API_KEY entries if they exist
sed -i '/^API_URL=/d' "$E2E_ENV_FILE"
sed -i '/^API_KEY=/d' "$E2E_ENV_FILE"

# Append new values
echo "API_URL=${API_ENDPOINT}hello" >> "$E2E_ENV_FILE"
echo "API_KEY=$API_KEY" >> "$E2E_ENV_FILE"

echo ""
echo "Updated $E2E_ENV_FILE with preview backend API configuration"
cat "$E2E_ENV_FILE"
