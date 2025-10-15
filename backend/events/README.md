# LearnerMax Backend Test Events

This directory contains test event files for local development and testing of the LearnerMax backend.

## Overview

These test events mimic production data structure but use clearly identifiable test accounts that should be cleaned up regularly from preview environments.

## Test Data Naming Convention

All test data uses the `TEST-` prefix to clearly identify it as test data:

- **User IDs**: `TEST-USER-EMAIL-001`, `TEST-USER-GOOGLE-001`, etc.
- **Email addresses**: `test.email.001@learnermax-test.com`, `test.google.001@learnermax-test.com`
- **Course IDs**: `TEST-COURSE-001`, `TEST-COURSE-002`, etc.
- **Usernames**: `testuser_email_001`, `google_123456789_testuser`

## Test Event Files

### Lambda Events

#### 1. Cognito PostConfirmation Events

**Email Signup:**
```bash
# File: cognito-post-confirmation-email.json
# Use case: Test email signup flow
# Creates: TEST-USER-EMAIL-001
```

**Google Signup:**
```bash
# File: cognito-post-confirmation-google.json
# Use case: Test Google OAuth signup flow
# Creates: TEST-USER-GOOGLE-001
```

#### 2. SNS Student Onboarding Events

**Email User Onboarding:**
```bash
# File: sns-student-onboarding-email.json
# Use case: Test student record creation via SNS
# Creates: Student record for TEST-USER-EMAIL-001
```

**Google User Onboarding:**
```bash
# File: sns-student-onboarding-google.json
# Use case: Test student record creation via SNS for Google users
# Creates: Student record for TEST-USER-GOOGLE-001
```

### API Test Requests

**API Request Script:**
```bash
# File: ../scripts/api-requests.sh
# Executable shell script with curl commands for all API endpoints
# Tests authenticated and unauthenticated routes
```

Usage:
```bash
# Start backend locally
cd backend
pnpm run dev:bg

# Run test requests
./scripts/api-requests.sh

# View logs
pnpm run dev:logs

# Stop backend
pnpm run dev:stop
```

## Testing Workflows

### 1. Test Lambda Functions Locally

**Using SAM CLI:**
```bash
cd backend

# Build
sam build

# Test PostConfirmation Lambda (Email)
sam local invoke PostConfirmationFunction \
  --event events/cognito-post-confirmation-email.json \
  --env-vars env.json

# Test PostConfirmation Lambda (Google)
sam local invoke PostConfirmationFunction \
  --event events/cognito-post-confirmation-google.json \
  --env-vars env.json

# Test Student Onboarding Lambda (Email)
sam local invoke StudentOnboardingFunction \
  --event events/sns-student-onboarding-email.json \
  --env-vars env.json

# Test Student Onboarding Lambda (Google)
sam local invoke StudentOnboardingFunction \
  --event events/sns-student-onboarding-google.json \
  --env-vars env.json
```

**Note:** You'll need to create `env.json` with:
```json
{
  "Parameters": {
    "SNS_TOPIC_ARN": "arn:aws:sns:us-east-1:123456789012:test-topic",
    "EDUCATION_TABLE_NAME": "learnermax-preview-education-table",
    "AWS_REGION": "us-east-1"
  }
}
```

### 2. Test Express API Locally

```bash
# Start backend
cd backend
pnpm run dev:bg

# Seed test courses first (required for course-related endpoints)
./scripts/seed-test-courses.sh

# Run all API tests
./scripts/api-requests.sh

# Or test individual endpoints with curl
# Example: Get student profile
curl -X GET "http://localhost:8080/api/students/me" \
  -H "Content-Type: application/json" \
  -H "x-amzn-request-context: {\"authorizer\":{\"claims\":{\"sub\":\"TEST-USER-EMAIL-001\",\"email\":\"test.email.001@learnermax-test.com\"}}}"

# Stop backend
pnpm run dev:stop
```

### 3. Test Against Preview Environment

```bash
# Deploy to preview
./scripts/deploy-preview-backend.sh

# Seed test courses to preview DynamoDB
export EDUCATION_TABLE_NAME="your-preview-table-name"
./scripts/seed-test-courses.sh

# Update BASE_URL in api-requests.sh to preview URL
# Run tests against preview
./scripts/api-requests.sh
```

## Test Data Cleanup Plan

### Why Cleanup is Important

Test data accumulates in preview DynamoDB tables during development and testing. Regular cleanup is essential to:
- Prevent test data from affecting metrics
- Reduce storage costs
- Maintain clean preview environments
- Avoid confusion between test and real data

### Cleanup Strategy

#### 1. Manual Cleanup (Ad-hoc)

Use the AWS CLI or DynamoDB console to delete test records:

```bash
# Set environment variables
export AWS_REGION="us-east-1"
export TABLE_NAME="learnermax-preview-education-table"

# Delete test user records
aws dynamodb delete-item \
  --table-name $TABLE_NAME \
  --key '{"PK": {"S": "USER#TEST-USER-EMAIL-001"}, "SK": {"S": "METADATA"}}'

aws dynamodb delete-item \
  --table-name $TABLE_NAME \
  --key '{"PK": {"S": "USER#TEST-USER-GOOGLE-001"}, "SK": {"S": "METADATA"}}'

# Delete test enrollment records
aws dynamodb delete-item \
  --table-name $TABLE_NAME \
  --key '{"PK": {"S": "USER#TEST-USER-EMAIL-001"}, "SK": {"S": "ENROLLMENT#TEST-COURSE-001"}}'
```

#### 2. Automated Cleanup Script (Recommended)

Create a cleanup script to remove all test data:

```bash
# File: scripts/cleanup-test-data.sh
#!/bin/bash

# Cleanup all test data from preview DynamoDB
# Uses the TEST- prefix pattern to identify test records

REGION="${AWS_REGION:-us-east-1}"
TABLE="${EDUCATION_TABLE_NAME:-learnermax-preview-education-table}"

echo "Cleaning up test data from ${TABLE}..."

# Query for all records with PK starting with USER#TEST-
aws dynamodb query \
  --region $REGION \
  --table-name $TABLE \
  --key-condition-expression "begins_with(PK, :pk)" \
  --expression-attribute-values '{":pk":{"S":"USER#TEST-"}}' \
  --projection-expression "PK,SK" \
  --output json \
| jq -r '.Items[] | @json' \
| while read item; do
    PK=$(echo $item | jq -r '.PK.S')
    SK=$(echo $item | jq -r '.SK.S')
    echo "Deleting: PK=$PK, SK=$SK"
    aws dynamodb delete-item \
      --region $REGION \
      --table-name $TABLE \
      --key "{\"PK\":{\"S\":\"$PK\"},\"SK\":{\"S\":\"$SK\"}}"
done

echo "Test data cleanup completed!"
```

#### 3. Scheduled Cleanup (Best Practice)

For production-like preview environments, set up a scheduled Lambda or EventBridge rule to clean up test data:

**Lambda Function Pseudocode:**
```typescript
// File: src/lambdas/cleanup-test-data.ts
export const handler = async () => {
  // Query DynamoDB for all items with TEST- prefix
  // Delete items older than 7 days
  // Log cleanup metrics
};
```

**EventBridge Schedule:**
```yaml
# SAM template addition
CleanupTestDataSchedule:
  Type: AWS::Events::Rule
  Properties:
    Description: Clean up test data weekly
    ScheduleExpression: 'cron(0 2 ? * SUN *)'  # Every Sunday at 2 AM UTC
    State: ENABLED
    Targets:
      - Arn: !GetAtt CleanupTestDataFunction.Arn
        Id: CleanupTestDataTarget
```

### Cleanup Checklist

Before deploying to production or during preview environment maintenance:

- [ ] Identify all test records (look for `TEST-` prefix in userId, courseId, etc.)
- [ ] Back up test data if needed for debugging
- [ ] Delete test user records (`USER#TEST-*`)
- [ ] Delete test enrollment records (`ENROLLMENT#TEST-*`)
- [ ] Delete test course records if any (`COURSE#TEST-*`)
- [ ] Verify cleanup with DynamoDB scan or query
- [ ] Document any issues encountered during cleanup

## Best Practices

### 1. Always Use TEST- Prefix

When creating test data manually or via scripts, always use the `TEST-` prefix:

```typescript
const testUserId = 'TEST-USER-EMAIL-001';  // Good
const userId = 'user-123';                 // Bad - could be mistaken for real data
```

### 2. Use Consistent Numbering

Follow a consistent numbering scheme for test accounts:
- `TEST-USER-EMAIL-001`, `TEST-USER-EMAIL-002`, etc.
- `TEST-USER-GOOGLE-001`, `TEST-USER-GOOGLE-002`, etc.
- `TEST-COURSE-001`, `TEST-COURSE-002`, etc.

### 3. Document Test Data

When creating new test scenarios, document them in this README:
- Purpose of the test data
- User IDs and email addresses used
- Which endpoints/features are being tested

### 4. Clean Up After Testing

After completing a test session:
1. Note which test accounts were created
2. Clean up test data from the database
3. Update test account numbers to avoid conflicts

### 5. Isolate Test Data

Keep test data isolated from real data:
- Use separate preview environments
- Never test with real user emails
- Use the `@learnermax-test.com` domain for test emails

## Troubleshooting

### Issue: Test data still appears after cleanup

**Solution:** Check all GSI (Global Secondary Indexes) and clean up there too:
```bash
# Check GSI1 (email-index)
aws dynamodb query \
  --table-name $TABLE_NAME \
  --index-name email-index \
  --key-condition-expression "email = :email" \
  --expression-attribute-values '{":email":{"S":"test.email.001@learnermax-test.com"}}'
```

### Issue: Cannot delete items

**Solution:** Ensure you have the correct partition key (PK) and sort key (SK):
```bash
# Use describe-table to verify key schema
aws dynamodb describe-table --table-name $TABLE_NAME | jq '.Table.KeySchema'
```

### Issue: Too many test accounts

**Solution:** Run a bulk cleanup using scan and delete:
```bash
# Scan for all TEST- records and delete (use with caution!)
aws dynamodb scan \
  --table-name $TABLE_NAME \
  --filter-expression "begins_with(PK, :prefix)" \
  --expression-attribute-values '{":prefix":{"S":"USER#TEST-"}}' \
  --projection-expression "PK,SK"
```

## Additional Resources

- [AWS SAM Local Testing](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-invoke.html)
- [DynamoDB Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [Cognito Lambda Triggers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html)
- [Express.js Testing Best Practices](https://jestjs.io/docs/tutorial-async)

## Contributing

When adding new test events:
1. Follow the naming conventions
2. Use the TEST- prefix consistently
3. Document the event in this README
4. Include cleanup instructions if needed
5. Update the cleanup script to handle new test data patterns
