# Backend Scripts

This directory contains utility scripts for backend development, testing, deployment, and data management.

## Script Overview

### Testing & Development Scripts

#### `api-requests.sh`
**Purpose:** Test all API endpoints with curl commands

**Usage:**
```bash
# Start backend first
pnpm run dev:bg

# Run all API tests
./scripts/api-requests.sh
```

**What it tests:**
- Health check endpoint
- Student profile operations (GET, PATCH)
- Course operations (GET all, GET by ID)
- Enrollment operations (POST, GET, check status)
- Both email and Google OAuth users

**Prerequisites:**
- Backend running (locally or preview)
- Test courses seeded (see `seed-test-courses.sh`)
- Test users created via Lambda events or API

---

#### `seed-test-courses.sh`
**Purpose:** Seed test courses directly into DynamoDB

**Usage:**
```bash
# Preview first
./scripts/seed-test-courses.sh --dry-run

# Create test courses
./scripts/seed-test-courses.sh
```

**What it creates:**
- `TEST-COURSE-001`: Introduction to Web Development (Free)
- `TEST-COURSE-002`: Advanced JavaScript (Free)
- `TEST-COURSE-003`: Full-Stack Development Bootcamp (Paid - $99.99)
- `TEST-COURSE-004`: React for Beginners (Free)
- `TEST-COURSE-005`: AWS Cloud Mastery (Paid - $149.99)

**Why we need this:**
The course API only has GET endpoints (no POST to create courses). This script is the only way to populate test courses for API testing.

**Environment Variables:**
- `AWS_REGION`: AWS region (default: us-east-1)
- `EDUCATION_TABLE_NAME`: DynamoDB table name (default: learnermax-preview-education-table)

---

#### `cleanup-test-data.sh`
**Purpose:** Remove all test data from preview DynamoDB

**Usage:**
```bash
# Preview what will be deleted
./scripts/cleanup-test-data.sh --dry-run

# Actually delete test data
./scripts/cleanup-test-data.sh
```

**What it cleans:**
- All user records with `TEST-` prefix
- All enrollment records with `TEST-` prefix
- All course records with `TEST-` prefix

**When to run:**
- After testing sessions
- Before demos or presentations
- Weekly cleanup of preview environments
- Before production deployments

**Environment Variables:**
- `AWS_REGION`: AWS region (default: us-east-1)
- `EDUCATION_TABLE_NAME`: DynamoDB table name (default: learnermax-preview-education-table)

---

### Deployment Scripts

#### `deploy-preview-backend.sh`
**Purpose:** Deploy backend to AWS preview environment

**Usage:**
```bash
./scripts/deploy-preview-backend.sh
```

**What it does:**
- Builds TypeScript code
- Packages SAM application
- Deploys to AWS using SAM

---

#### `deploy-preview-frontend.sh`
**Purpose:** Deploy frontend to Vercel preview

**Location:** `../../scripts/deploy-preview-frontend.sh` (root level)

---

### Monitoring Scripts

#### `start-sam-logs.sh`
**Purpose:** Start tailing SAM/Lambda logs in background

**Usage:**
```bash
./scripts/start-sam-logs.sh
```

**Output:** Logs written to `.sam-logs.log`

---

#### `stop-sam-logs.sh`
**Purpose:** Stop SAM log tailing

**Usage:**
```bash
./scripts/stop-sam-logs.sh
```

---

### Local Development Scripts

#### `start-dev-bg.sh`
**Purpose:** Start backend server in background

**Usage:**
```bash
pnpm run dev:bg
# or
./scripts/start-dev-bg.sh
```

**Output:** Logs written to `.local-dev.log`

---

#### `stop-dev-bg.sh`
**Purpose:** Stop background backend server

**Usage:**
```bash
pnpm run dev:stop
# or
./scripts/stop-dev-bg.sh
```

---

## Common Workflows

### 1. Local API Testing

```bash
# 1. Start backend
pnpm run dev:bg

# 2. Seed test courses (required!)
./scripts/seed-test-courses.sh

# 3. Run API tests
./scripts/api-requests.sh

# 4. View logs
pnpm run dev:logs

# 5. Stop backend
pnpm run dev:stop

# 6. Clean up test data
./scripts/cleanup-test-data.sh
```

### 2. Preview Environment Testing

```bash
# 1. Deploy backend
./scripts/deploy-preview-backend.sh

# 2. Seed test courses to preview
export EDUCATION_TABLE_NAME="your-preview-table-name"
./scripts/seed-test-courses.sh

# 3. Update BASE_URL in api-requests.sh to preview URL
# 4. Run tests
./scripts/api-requests.sh

# 5. Clean up when done
./scripts/cleanup-test-data.sh
```

### 3. Lambda Function Testing

```bash
# 1. Build SAM
sam build

# 2. Test with Lambda events (see ../events/ folder)
sam local invoke PostConfirmationFunction \
  --event ../events/cognito-post-confirmation-email.json

sam local invoke StudentOnboardingFunction \
  --event ../events/sns-student-onboarding-email.json
```

### 4. Weekly Preview Cleanup

```bash
# Recommended: Run weekly to keep preview environments clean
export EDUCATION_TABLE_NAME="learnermax-preview-education-table"
./scripts/cleanup-test-data.sh
```

---

## Script Dependencies

### Required Tools

All scripts require:
- `bash` shell
- `aws` CLI (for AWS operations)
- `jq` (for JSON parsing)
- `curl` (for API testing)

Install on Ubuntu/Debian:
```bash
sudo apt-get install awscli jq curl
```

Install on macOS:
```bash
brew install awscli jq curl
```

### Environment Setup

For scripts to work properly, ensure:

1. **AWS Credentials:** Configured via `aws configure` or environment variables
2. **AWS Region:** Set via `AWS_REGION` environment variable (defaults to us-east-1)
3. **Table Name:** Set via `EDUCATION_TABLE_NAME` for preview environments

---

## Script Relationships

```
Local Testing Flow:
start-dev-bg.sh → seed-test-courses.sh → api-requests.sh → cleanup-test-data.sh

Preview Testing Flow:
deploy-preview-backend.sh → seed-test-courses.sh → api-requests.sh → cleanup-test-data.sh

Lambda Testing Flow:
sam build → sam local invoke (using ../events/*.json)
```

---

## Why Keep Both `seed-test-courses.sh` and `api-requests.sh`?

**TL;DR:** They serve different purposes and cannot replace each other.

### `seed-test-courses.sh` (Data Creation)
- **Purpose:** Creates test courses in DynamoDB
- **Method:** Direct DynamoDB operations
- **Why needed:** API has no POST /api/courses endpoint
- **When to use:** Before testing, to populate test data

### `api-requests.sh` (API Testing)
- **Purpose:** Tests API endpoints
- **Method:** HTTP requests via curl
- **Why needed:** Validates API functionality
- **When to use:** After seeding data, to test APIs

**They work together:**
1. `seed-test-courses.sh` creates the data
2. `api-requests.sh` tests the API against that data

---

## Script Best Practices

1. **Always use --dry-run first** when running destructive operations
2. **Check environment variables** before running scripts in preview/production
3. **Read script output** to verify operations completed successfully
4. **Keep test data clean** by running cleanup regularly
5. **Document new scripts** by adding them to this README

---

## Troubleshooting

### Script Permission Denied
```bash
chmod +x ./scripts/script-name.sh
```

### AWS CLI Not Authenticated
```bash
aws configure
# or
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

### jq Not Found
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq
```

### Script Can't Find Table
```bash
# Check if table exists
aws dynamodb describe-table --table-name learnermax-preview-education-table

# Or set custom table name
export EDUCATION_TABLE_NAME="your-table-name"
./scripts/script-name.sh
```

### No Test Data Showing in API
```bash
# Make sure you seeded courses first
./scripts/seed-test-courses.sh

# Verify courses were created
aws dynamodb scan --table-name learnermax-preview-education-table \
  --filter-expression "begins_with(PK, :prefix)" \
  --expression-attribute-values '{":prefix":{"S":"COURSE#TEST-"}}'
```

---

## Contributing

When adding new scripts:

1. Make script executable: `chmod +x script-name.sh`
2. Add usage comments at top of script
3. Support `--dry-run` flag for destructive operations
4. Use consistent naming: `action-subject.sh` (e.g., `cleanup-test-data.sh`)
5. Document in this README
6. Add to appropriate workflow section

---

## Additional Resources

- [Test Events Documentation](../events/README.md)
- [AWS SAM CLI Reference](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-command-reference.html)
- [DynamoDB CLI Reference](https://docs.aws.amazon.com/cli/latest/reference/dynamodb/)
- [jq Manual](https://stedolan.github.io/jq/manual/)
