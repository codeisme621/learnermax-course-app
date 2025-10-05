# Scripts

This directory contains all deployment and monitoring scripts for the LearnerMax Course App.

## Signal System for AI Coding Agents

The log tailing scripts provide real-time feedback ("signal") to AI coding agents by monitoring deployment logs in the background. This allows the agent to see what's happening in deployed environments while running tests or making changes.

## Deployment Scripts

### Frontend Deployment

**`deploy-preview-frontend.sh`** - Deploy frontend to Vercel preview environment

```bash
./scripts/deploy-preview-frontend.sh
```

This will:
1. Deploy the frontend to Vercel
2. Capture the preview URL
3. Update `e2e/.env` with the preview URL for E2E testing

### Backend Deployment

**`deploy-preview-backend.sh`** - Deploy backend to AWS SAM preview environment

```bash
./scripts/deploy-preview-backend.sh
```

This will:
1. Build TypeScript (`pnpm run build`)
2. Run SAM build (`sam build`)
3. Deploy to preview stack (`sam deploy --config-env preview`)
4. Get API endpoint and API key from CloudFormation outputs
5. Update `e2e/.env` with backend API configuration

## Log Monitoring Scripts

### Vercel Logs (Frontend)

**`start-vercel-logs.sh`** - Start tailing Vercel logs in background

```bash
./scripts/start-vercel-logs.sh
```

This will:
- Read the preview URL from `e2e/.env`
- Start `vercel logs <url> --follow` in the background
- Write logs to `scripts/.vercel-logs.log`
- Save process PID to `scripts/.vercel-logs.pid`

**`stop-vercel-logs.sh`** - Stop Vercel log tailing

```bash
./scripts/stop-vercel-logs.sh
```

This will:
- Stop the background log process
- Clean up log file and PID file

### SAM Logs (Backend)

**`start-sam-logs.sh`** - Start tailing SAM/CloudWatch logs in background

```bash
./scripts/start-sam-logs.sh
```

This is hardcoded to use the `preview` environment (`learnermax-course-app-preview` stack).

This will:
- Start `sam logs --stack-name learnermax-course-app-preview --tail` in the background
- Write logs to `scripts/.sam-logs.log`
- Save process PID to `scripts/.sam-logs.pid`

**`stop-sam-logs.sh`** - Stop SAM log tailing

```bash
./scripts/stop-sam-logs.sh
```

This will:
- Stop the background log process
- Clean up log file and PID file

## AI Agent Workflow

When an AI agent needs to validate changes:

1. **Deploy**: Run deployment script for frontend/backend
2. **Start monitoring**: Run appropriate start-*-logs.sh script
3. **Perform actions**: Run E2E tests, make API calls, etc.
4. **Check signal**: Read `scripts/.vercel-logs.log` or `scripts/.sam-logs.log`
5. **Analyze**: Determine if changes are working correctly
6. **Stop monitoring**: Run appropriate stop-*-logs.sh script

Example for frontend:
```bash
./scripts/deploy-preview-frontend.sh
./scripts/start-vercel-logs.sh
# ... run tests or make changes ...
cat scripts/.vercel-logs.log  # Check logs
./scripts/stop-vercel-logs.sh
```

Example for backend:
```bash
./scripts/deploy-preview-backend.sh
./scripts/start-sam-logs.sh
# ... run tests or make changes ...
cat scripts/.sam-logs.log  # Check logs
./scripts/stop-sam-logs.sh
```

## Prerequisites

### Frontend
- Vercel CLI installed and authenticated
- Access to the Vercel project

### Backend
- AWS SAM CLI installed and configured
- AWS credentials set up
- SAM stack deployed (`learnermax-course-app-preview`)

## Notes

- All scripts are designed to be run from the project root
- Log files (`.vercel-logs.log`, `.sam-logs.log`) are written to the `scripts/` directory
- PID files track background processes for cleanup
- The `--follow` flag on Vercel is deprecated but still works
- SAM logs show Lambda function execution and API Gateway requests
