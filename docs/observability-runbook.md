# LearnerMax Observability Runbook

This guide helps you monitor the LearnerMax application and troubleshoot issues using CloudWatch.

## Quick Links

| Resource | Preview | Prod |
|----------|---------|------|
| CloudWatch Dashboard | [Preview Dashboard](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=LearnerMax-Observability-preview) | [Prod Dashboard](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=LearnerMax-Observability-prod) |
| X-Ray Trace Map | [X-Ray Traces](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#xray:traces) | Same |
| Lambda Functions | [Lambda Console](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions) | Same |
| SQS Queues | [SQS Console](https://console.aws.amazon.com/sqs/v2/home?region=us-east-1#/queues) | Same |

---

## Dashboard Overview

The dashboard is organized into two sections:

### Business Metrics (Top)
- **User Registrations** - New signups (success/failure)
- **Daily Signups & Enrollments** - Daily totals
- **Daily Course Completions** - Courses completed
- **Premium Early Access Signups** - Premium interest
- **Premium Early Access Rate %** - Premium signups / Total signups
- **Course Completion Rate %** - Completions / Total signups

### Technical Metrics (Bottom)
- **Lambda Errors** - Function failures
- **Dead Letter Queue** - Failed messages (should always be 0)
- **HTTP 5xx Errors** - Server errors (should always be 0)
- **HTTP 4xx Errors** - Client errors (watch for spikes)
- **API Latency** - p50/p90/p99 response times
- **Lambda Duration** - Function execution time

---

## Alert Indicators

| Metric | Normal State | Alert Threshold | Severity |
|--------|-------------|-----------------|----------|
| Dead Letter Queue | 0 | >0 | **Critical** - Messages failed processing |
| HTTP 5xx Errors | 0 | >0 | **High** - Server errors occurring |
| HTTP 4xx Errors | Low/stable | Sudden spike | **Medium** - May indicate bugs or attacks |
| API Latency p99 | <2000ms | >2000ms | **Medium** - Performance degradation |
| Lambda Errors | 0 | >0 | **High** - Function failures |

---

## Issue: Dead Letter Queue > 0

**What it means:** Student onboarding messages failed to process after all retries.

### Drill-down Steps

1. **Check DLQ message count:**
   ```bash
   aws sqs get-queue-attributes \
     --queue-url https://sqs.us-east-1.amazonaws.com/853219709625/learnermax-student-onboarding-dlq-preview \
     --attribute-names ApproximateNumberOfMessages \
     --region us-east-1
   ```

2. **View DLQ messages in console:**
   - Go to [SQS Console](https://console.aws.amazon.com/sqs/v2/home?region=us-east-1#/queues)
   - Find `learnermax-student-onboarding-dlq-{env}`
   - Click "Send and receive messages" > "Poll for messages"
   - Examine message content to identify the failed user

3. **Check Lambda logs:**
   ```bash
   sam logs -n StudentOnboardingFunction --stack-name learnermax-course-app-preview --tail
   ```

4. **Look for error patterns** in logs (DynamoDB failures, validation errors)

### Common Causes
- DynamoDB throttling
- Invalid message format from Cognito
- Duplicate user (ConditionalCheckFailedException)
- Network/timeout issues

### Resolution
1. Fix the root cause
2. Redrive messages from DLQ back to main queue (or manually process)

---

## Issue: HTTP 5xx Errors

**What it means:** The Express API returned server errors.

### Drill-down Steps

1. **Tail Lambda logs:**
   ```bash
   sam logs -n ExpressApiFunction --stack-name learnermax-course-app-preview --tail
   ```

2. **Search for errors in CloudWatch Logs Insights:**
   ```
   fields @timestamp, @message
   | filter @message like /ERROR/ or @message like /5[0-9]{2}/
   | sort @timestamp desc
   | limit 50
   ```

3. **Use X-Ray to trace failed requests:**
   - Go to [X-Ray Traces](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#xray:traces)
   - Filter: `responsestatus = 500` or `error = true`
   - Click on a trace to see the full request flow
   - Look for red segments indicating failures

### Common Causes
- Unhandled exceptions in route handlers
- DynamoDB errors (throttling, condition failures)
- External service failures (Cognito, SES)
- Invalid request data causing crashes

### Resolution
1. Identify the specific endpoint and error from logs
2. Fix the code or add proper error handling
3. Deploy fix

---

## Issue: HTTP 4xx Spike

**What it means:** Client errors increased unexpectedly.

### Expected 4xx (Normal)
- **404** on `/api/progress/:courseId` - User hasn't started course yet
- **401** on protected routes - Unauthenticated requests
- **400** on validation failures - Invalid input

### Unexpected 4xx (Investigate)
- Sustained 400 errors on a single endpoint - Potential frontend bug
- 404 spikes on valid routes - Broken links or API changes
- 403 spikes - Authorization issues

### Drill-down Steps

1. **Query logs to find which routes are failing:**
   ```
   fields @timestamp, route, statusCode, method
   | filter statusCode >= 400 and statusCode < 500
   | stats count() by route, statusCode
   | sort count desc
   ```

2. **Check for patterns:**
   - Same route? Check frontend code
   - Same user? Check user account
   - Same time? Check for deployments or attacks

---

## Issue: High Latency (p99 > 2000ms)

**What it means:** Some requests are taking too long to respond.

### Drill-down Steps

1. **Check X-Ray Trace Map:**
   - Go to [X-Ray Service Map](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#xray:service-map)
   - Look for services with high latency (thick orange/red edges)
   - Click on a service to see latency distribution

2. **Find slow traces:**
   - In X-Ray Traces, filter: `responseTime > 2`
   - Examine the trace timeline to see which segment is slow

3. **Check Lambda Duration metric:**
   - Is the function itself slow, or downstream services?

### Common Causes
- **Cold starts** - Especially after deployments or low traffic periods
- **Large DynamoDB scans** - Need to optimize queries
- **External API slowness** - Cognito, SES, etc.
- **Memory pressure** - Lambda needs more memory

### Resolution
1. Identify the slow segment in X-Ray
2. Optimize the specific operation
3. Consider provisioned concurrency for critical functions

---

## Issue: Lambda Errors

**What it means:** A Lambda function threw an unhandled exception.

### Drill-down Steps

1. **Check which function is failing:**
   - Look at the dashboard to see which function has errors
   - `PostConfirmation`, `StudentOnboarding`, or `ExpressApi`

2. **View function logs:**
   ```bash
   # PostConfirmation (Cognito trigger)
   sam logs -n PostConfirmationFunction --stack-name learnermax-course-app-preview --tail

   # StudentOnboarding (SNS processor)
   sam logs -n StudentOnboardingFunction --stack-name learnermax-course-app-preview --tail

   # ExpressApi (HTTP API)
   sam logs -n ExpressApiFunction --stack-name learnermax-course-app-preview --tail
   ```

3. **Check X-Ray for the specific invocation:**
   - Filter by function name and error status

### Common Causes
- Code bugs (null reference, type errors)
- Timeout (function took too long)
- Out of memory
- Permission errors (IAM)

---

## Monitoring Commands

### Start Real-time Log Tailing

```bash
# Preview environment
./scripts/start-sam-logs.sh
tail -f scripts/.sam-logs.log

# Stop
./scripts/stop-sam-logs.sh
```

### Query CloudWatch Logs

```bash
# Find errors in the last hour
aws logs filter-log-events \
  --log-group-name "/aws/lambda/learnermax-course-app-preview-ExpressApiFunction-*" \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000) \
  --region us-east-1
```

### Check DLQ Status

```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/853219709625/learnermax-student-onboarding-dlq-preview \
  --attribute-names ApproximateNumberOfMessages \
  --region us-east-1
```

### Get Recent Metrics

```bash
# Get 5xx count for last hour
aws cloudwatch get-metric-statistics \
  --namespace "LearnerMax/Backend" \
  --metric-name "Http5xxCount" \
  --dimensions Name=service,Value=ExpressApi \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum \
  --region us-east-1
```

---

## Existing Alarms

These alarms are already configured and will notify via SNS:

1. **StudentOnboardingDLQAlarm** - Triggers when DLQ has any messages
2. **StudentOnboardingErrorAlarm** - Triggers when Lambda errors exceed 5 in 5 minutes

To add email notifications, subscribe to the SNS topic:
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:853219709625:learnermax-observability-alerts-preview \
  --protocol email \
  --notification-endpoint your-email@example.com \
  --region us-east-1
```

---

## When to Escalate

Escalate immediately if:
- DLQ messages accumulating and you can't identify the cause
- 5xx errors affecting multiple users
- Complete service outage
- Data inconsistency suspected

Check recent deployments first - most issues correlate with recent changes.
