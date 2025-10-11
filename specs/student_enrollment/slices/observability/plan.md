# Implementation Plan: Observability and Sign-In Bug Fix

**Date**: 2025-10-08
**Research**: `specs/student_enrollment/slices/observability/research.md`
**Spec**: `specs/student_enrollment/slices/observability/observability.md`

## Overview

This plan implements comprehensive observability for all backend Lambda functions using AWS Lambda Powertools, ADOT layers, structured logging, CloudWatch metrics, and CloudWatch Dashboard. Also fixes the sign-in button bug in the frontend.

## Requirements Summary

From spec:
- ✅ Fix sign-in button to link to `/signin` instead of `/enroll`
- ✅ Add ADOT layer to every Lambda function
- ✅ Implement AWS Lambda Powertools for structured logging
- ✅ Add business metrics: track successful user registrations
- ✅ Add tech metrics: track failures and latency
- ✅ Add DLQ monitoring: alert when messages arrive in DLQ
- ✅ Create CloudWatch Dashboard with all metrics
- ✅ All infrastructure changes in SAM template

---

## Phase 0: Quick Win - Fix Sign-In Button Bug
**Estimated Time**: 5 minutes

### Changes
- [x] Fix sign-in button link in Header component

**Files to modify**:
- `frontend/components/layout/Header.tsx`

**Specific changes**:
```typescript
// Line 18-20: Change from
<Link href="/enroll?courseid=course-001">Sign In</Link>

// To
<Link href="/signin">Sign In</Link>
```

### Success Criteria
- [ ] Sign-in button navigates to `/signin` page
- [ ] Header component tests still pass
- [ ] Manual verification: click button goes to sign-in page

---

## Phase 1: Install Dependencies and Configure ADOT Layer
**Estimated Time**: 15 minutes

### Changes
- [x] Install AWS Lambda Powertools for TypeScript
- [x] Add ADOT layer ARN to SAM template parameters
- [x] Apply ADOT layer to all 3 Lambda functions

**Files to modify**:
- `backend/package.json` - Add Powertools dependency
- `backend/template.yaml` - Add ADOT layer to all functions

**Specific changes**:

1. Install Powertools:
```bash
cd backend
pnpm add @aws-lambda-powertools/logger @aws-lambda-powertools/metrics @aws-lambda-powertools/tracer
```

2. SAM template updates:
   - Add parameter for ADOT layer ARN (after line 17):
   ```yaml
   AdotLayerArn:
     Type: String
     Default: arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:5
     Description: ARN for AWS Distro for OpenTelemetry (ADOT) Lambda layer
   ```

   - Add ADOT layer to PostConfirmationFunction (after line 212):
   ```yaml
   Layers:
     - !Ref AdotLayerArn
   ```

   - Add ADOT layer to StudentOnboardingFunction (after line 239):
   ```yaml
   Layers:
     - !Ref AdotLayerArn
   ```

   - Add ADOT layer to ExpressApiFunction (modify existing Layers at line 279):
   ```yaml
   Layers:
     - !Sub arn:aws:lambda:${AWS::Region}:753240598075:layer:LambdaAdapterLayerX86:25
     - !Ref AdotLayerArn
   ```

### Success Criteria
- [ ] Powertools packages installed successfully
- [ ] `pnpm install` completes without errors
- [ ] SAM template validates: `sam validate`
- [ ] All Lambda functions have ADOT layer configured

---

## Phase 2: Implement Structured Logging with Powertools
**Estimated Time**: 30 minutes

### Changes
- [ ] Create shared Logger configuration utility
- [ ] Replace console.log with Powertools Logger in PostConfirmation
- [ ] Replace console.log with Powertools Logger in StudentOnboarding
- [ ] Replace console.log with Powertools Logger in Express API routes

**Files to create**:
- `backend/src/lib/logger.ts` - Shared logger factory

**Files to modify**:
- `backend/src/lambdas/post-confirmation.ts`
- `backend/src/lambdas/student-onboarding.ts`
- `backend/src/routes/students.ts`
- `backend/src/app.ts`

**Specific implementation**:

1. Create `backend/src/lib/logger.ts`:
```typescript
import { Logger } from '@aws-lambda-powertools/logger';

export const createLogger = (serviceName: string): Logger => {
  return new Logger({
    serviceName,
    logLevel: process.env.LOG_LEVEL || 'INFO',
  });
};
```

2. Update PostConfirmation Lambda:
   - Import logger at top
   - Replace all console.log/error with logger.info/error
   - Add correlation IDs and structured fields

3. Update StudentOnboarding Lambda:
   - Import logger at top
   - Replace all console.log/error with logger.info/error
   - Add structured fields for userId, email, signUpMethod

4. Update Express API routes:
   - Import logger at top of routes/students.ts
   - Replace console.error with logger.error
   - Add structured fields for userId, operation type

### Success Criteria
- [ ] All Lambda functions use Powertools Logger
- [ ] No console.log/error statements remain
- [ ] Unit tests pass: `pnpm test`
- [ ] TypeScript compiles: `pnpm run build`
- [ ] Logs include structured fields (service name, log level, timestamp)

---

## Phase 3: Implement Business Metrics
**Estimated Time**: 20 minutes

### Changes
- [ ] Create shared Metrics utility
- [ ] Add "UserRegistrationSuccess" metric in StudentOnboarding Lambda
- [ ] Add "UserRegistrationFailure" metric in StudentOnboarding Lambda
- [ ] Configure metrics namespace and dimensions

**Files to create**:
- `backend/src/lib/metrics.ts` - Shared metrics factory

**Files to modify**:
- `backend/src/lambdas/student-onboarding.ts`

**Specific implementation**:

1. Create `backend/src/lib/metrics.ts`:
```typescript
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

export const createMetrics = (namespace: string, serviceName: string): Metrics => {
  return new Metrics({
    namespace,
    serviceName,
  });
};
```

2. Update StudentOnboarding Lambda:
   - Import metrics utility
   - Add metric after successful DynamoDB insert (line 58):
     ```typescript
     metrics.addMetric('UserRegistrationSuccess', MetricUnit.Count, 1);
     metrics.addDimension('signUpMethod', message.signUpMethod);
     ```
   - Add metric in error handler (before line 68):
     ```typescript
     metrics.addMetric('UserRegistrationFailure', MetricUnit.Count, 1);
     ```
   - Publish metrics at end of handler with `metrics.publishStoredMetrics()`

### Success Criteria
- [ ] Metrics utility created
- [ ] UserRegistrationSuccess metric emitted on successful insert
- [ ] UserRegistrationFailure metric emitted on errors
- [ ] Metrics include dimensions (signUpMethod)
- [ ] Unit tests pass with metrics
- [ ] TypeScript compiles

---

## Phase 4: Implement Technical Metrics
**Estimated Time**: 25 minutes

### Changes
- [ ] Add Lambda error metrics for all functions
- [ ] Add Lambda duration/latency metrics for all functions
- [ ] Add DynamoDB operation metrics in StudentOnboarding

**Files to modify**:
- `backend/src/lambdas/post-confirmation.ts`
- `backend/src/lambdas/student-onboarding.ts`
- `backend/src/routes/students.ts`

**Specific implementation**:

1. PostConfirmation Lambda:
   - Add SNSPublishSuccess/SNSPublishFailure metrics
   - Add latency tracking for SNS publish operation
   - Add metric in catch block for lambda failures

2. StudentOnboarding Lambda:
   - Add DynamoDBPutSuccess/DynamoDBPutFailure metrics
   - Add DuplicateUserDetected metric (line 62)
   - Add latency tracking for DynamoDB operations

3. Express API (students routes):
   - Add CreateStudentSuccess/CreateStudentFailure metrics
   - Add UpdateStudentSuccess/UpdateStudentFailure metrics
   - Add GetStudentSuccess/GetStudentFailure metrics
   - Add latency tracking for each operation

### Success Criteria
- [ ] All operations have success/failure metrics
- [ ] Latency metrics captured for critical operations
- [ ] Metrics namespace: "LearnerMax/Backend"
- [ ] Unit tests pass
- [ ] TypeScript compiles

---

## Phase 5: Configure DLQ Monitoring and Alarms
**Estimated Time**: 20 minutes

### Changes
- [ ] Add CloudWatch Alarm for DLQ messages
- [ ] Add SNS topic for alarm notifications
- [ ] Configure alarm to trigger on any message in DLQ

**Files to modify**:
- `backend/template.yaml`

**Specific implementation**:

1. Create SNS topic for alerts (after line 188):
```yaml
ObservabilityAlertTopic:
  Type: AWS::SNS::Topic
  Properties:
    TopicName: !Sub learnermax-observability-alerts-${Environment}
    DisplayName: LearnerMax Observability Alerts
    Tags:
      - Key: Environment
        Value: !Ref Environment
      - Key: Project
        Value: LearnerMax
```

2. Create CloudWatch Alarm for DLQ (after StudentOnboardingDLQ at line 200):
```yaml
StudentOnboardingDLQAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub learnermax-student-onboarding-dlq-alarm-${Environment}
    AlarmDescription: Alert when messages arrive in Student Onboarding DLQ
    MetricName: ApproximateNumberOfMessagesVisible
    Namespace: AWS/SQS
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 1
    Threshold: 1
    ComparisonOperator: GreaterThanOrEqualToThreshold
    Dimensions:
      - Name: QueueName
        Value: !GetAtt StudentOnboardingDLQ.QueueName
    AlarmActions:
      - !Ref ObservabilityAlertTopic
    TreatMissingData: notBreaching
```

3. Add alarm for Lambda errors (after DLQ alarm):
```yaml
StudentOnboardingErrorAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub learnermax-student-onboarding-errors-${Environment}
    AlarmDescription: Alert on Student Onboarding Lambda errors
    MetricName: Errors
    Namespace: AWS/Lambda
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 5
    ComparisonOperator: GreaterThanThreshold
    Dimensions:
      - Name: FunctionName
        Value: !Ref StudentOnboardingFunction
    AlarmActions:
      - !Ref ObservabilityAlertTopic
```

### Success Criteria
- [ ] SNS alert topic created
- [ ] DLQ alarm triggers when messages >= 1
- [ ] Lambda error alarm triggers when errors > 5 in 5 minutes
- [ ] SAM template validates
- [ ] Alarms reference correct resources

---

## Phase 6: Create CloudWatch Dashboard
**Estimated Time**: 30 minutes

### Changes
- [ ] Create CloudWatch Dashboard with all metrics
- [ ] Add widgets for business metrics (user registrations)
- [ ] Add widgets for technical metrics (errors, latency)
- [ ] Add widgets for DLQ monitoring
- [ ] Add widgets for Lambda performance

**Files to modify**:
- `backend/template.yaml`

**Specific implementation**:

Add CloudWatch Dashboard resource (before Outputs section around line 325):

```yaml
ObservabilityDashboard:
  Type: AWS::CloudWatch::Dashboard
  Properties:
    DashboardName: !Sub LearnerMax-Observability-${Environment}
    DashboardBody: !Sub |
      {
        "widgets": [
          {
            "type": "metric",
            "properties": {
              "metrics": [
                ["LearnerMax/Backend", "UserRegistrationSuccess", {"stat": "Sum"}],
                [".", "UserRegistrationFailure", {"stat": "Sum"}]
              ],
              "period": 300,
              "stat": "Sum",
              "region": "${AWS::Region}",
              "title": "User Registrations (Business Metric)",
              "yAxis": {"left": {"min": 0}}
            }
          },
          {
            "type": "metric",
            "properties": {
              "metrics": [
                ["AWS/Lambda", "Errors", {"stat": "Sum", "dimensions": {"FunctionName": "${PostConfirmationFunction}"}}],
                ["...", {"dimensions": {"FunctionName": "${StudentOnboardingFunction}"}}],
                ["...", {"dimensions": {"FunctionName": "${ExpressApiFunction}"}}]
              ],
              "period": 300,
              "stat": "Sum",
              "region": "${AWS::Region}",
              "title": "Lambda Errors (Technical Metric)",
              "yAxis": {"left": {"min": 0}}
            }
          },
          {
            "type": "metric",
            "properties": {
              "metrics": [
                ["AWS/Lambda", "Duration", {"stat": "Average", "dimensions": {"FunctionName": "${PostConfirmationFunction}"}}],
                ["...", {"dimensions": {"FunctionName": "${StudentOnboardingFunction}"}}],
                ["...", {"dimensions": {"FunctionName": "${ExpressApiFunction}"}}]
              ],
              "period": 300,
              "stat": "Average",
              "region": "${AWS::Region}",
              "title": "Lambda Duration (Latency)",
              "yAxis": {"left": {"min": 0}}
            }
          },
          {
            "type": "metric",
            "properties": {
              "metrics": [
                ["AWS/SQS", "ApproximateNumberOfMessagesVisible", {"dimensions": {"QueueName": "${StudentOnboardingDLQ.QueueName}"}}]
              ],
              "period": 60,
              "stat": "Sum",
              "region": "${AWS::Region}",
              "title": "Dead Letter Queue Messages",
              "yAxis": {"left": {"min": 0}}
            }
          },
          {
            "type": "metric",
            "properties": {
              "metrics": [
                ["LearnerMax/Backend", "DynamoDBPutSuccess", {"stat": "Sum"}],
                [".", "DynamoDBPutFailure", {"stat": "Sum"}]
              ],
              "period": 300,
              "stat": "Sum",
              "region": "${AWS::Region}",
              "title": "DynamoDB Operations",
              "yAxis": {"left": {"min": 0}}
            }
          },
          {
            "type": "metric",
            "properties": {
              "metrics": [
                ["LearnerMax/Backend", "SNSPublishSuccess", {"stat": "Sum"}],
                [".", "SNSPublishFailure", {"stat": "Sum"}]
              ],
              "period": 300,
              "stat": "Sum",
              "region": "${AWS::Region}",
              "title": "SNS Publishing",
              "yAxis": {"left": {"min": 0}}
            }
          }
        ]
      }
```

Add dashboard URL to Outputs section (after line 374):
```yaml
DashboardUrl:
  Description: CloudWatch Dashboard URL for Observability
  Value: !Sub https://console.aws.amazon.com/cloudwatch/home?region=${AWS::Region}#dashboards:name=${ObservabilityDashboard}
  Export:
    Name: !Sub ${AWS::StackName}-DashboardUrl
```

### Success Criteria
- [ ] Dashboard created in SAM template
- [ ] Dashboard includes all required widgets:
  - Business metrics (user registrations)
  - Technical metrics (errors, latency)
  - DLQ monitoring
  - Lambda performance
  - DynamoDB operations
  - SNS publishing
- [ ] Dashboard URL exported in Outputs
- [ ] SAM template validates

---

## Phase 7: Add Unit Tests for Observability
**Estimated Time**: 25 minutes

### Changes
- [ ] Update PostConfirmation tests to verify metrics
- [ ] Update StudentOnboarding tests to verify metrics
- [ ] Add tests for logger usage
- [ ] Ensure 90% test coverage maintained

**Files to modify**:
- `backend/src/lambdas/__tests__/post-confirmation.test.ts`
- `backend/src/lambdas/__tests__/student-onboarding.test.ts`

**Specific implementation**:

1. Mock Powertools Logger and Metrics in tests
2. Verify logger.info/error called with correct parameters
3. Verify metrics.addMetric called with correct values
4. Test metric dimensions and namespaces
5. Test that publishStoredMetrics is called

### Success Criteria
- [ ] All tests pass: `pnpm test`
- [ ] Test coverage >= 90%: `pnpm run test:coverage`
- [ ] Tests verify Logger usage
- [ ] Tests verify Metrics emission
- [ ] No regression in existing tests

---

## Phase 8: Integration Testing and Validation
**Estimated Time**: 30 minutes

### Changes
- [ ] Deploy to preview environment
- [ ] Verify structured logging in CloudWatch Logs
- [ ] Verify metrics in CloudWatch Metrics
- [ ] Verify dashboard displays data
- [ ] Test DLQ alarm manually
- [ ] Verify ADOT layer is active

**Testing steps**:

1. Build and deploy:
```bash
cd backend
pnpm run build
sam build
sam deploy
```

2. Trigger PostConfirmation Lambda:
   - Sign up a new test user in Cognito
   - Verify logs show Powertools structured logging
   - Verify SNS metrics in CloudWatch

3. Verify StudentOnboarding Lambda:
   - Check CloudWatch Logs for structured logs
   - Verify UserRegistrationSuccess metric in CloudWatch
   - Check DynamoDB for new user record

4. Test DLQ alarm:
   - Manually send malformed message to DLQ (or cause failure)
   - Verify alarm triggers within 1 minute

5. Verify Dashboard:
   - Open dashboard URL from stack outputs
   - Verify all widgets display data
   - Verify metrics update in real-time

6. Verify ADOT layer:
   - Check Lambda console shows ADOT layer attached
   - Verify X-Ray traces include ADOT instrumentation

### Success Criteria
- [ ] Deployment succeeds without errors
- [ ] Structured logs visible in CloudWatch Logs
- [ ] Custom metrics visible in CloudWatch Metrics
- [ ] Dashboard displays all widgets with data
- [ ] DLQ alarm triggers when expected
- [ ] ADOT layer visible in Lambda configuration
- [ ] X-Ray traces show enhanced instrumentation
- [ ] UserRegistrationSuccess metric increments on sign-up

---

## Phase 9: Frontend Testing
**Estimated Time**: 10 minutes

### Changes
- [ ] Verify sign-in button fix works
- [ ] Test navigation from landing page
- [ ] Update frontend tests if needed

**Testing steps**:

1. Start frontend dev server:
```bash
cd frontend
pnpm run dev
```

2. Manual testing:
   - Navigate to landing page (localhost:3000)
   - Click "Sign In" button in header
   - Verify redirects to `/signin` page (not `/enroll`)

3. Run frontend tests:
```bash
pnpm test
```

### Success Criteria
- [ ] Sign-in button navigates to `/signin` page
- [ ] No navigation to `/enroll` page
- [ ] Frontend tests pass
- [ ] No console errors in browser

---

## Phase 10: Documentation and Cleanup
**Estimated Time**: 15 minutes

### Changes
- [ ] Update implementation.md with results
- [ ] Document dashboard URL
- [ ] Document alarm configuration
- [ ] Document metrics namespace and dimensions
- [ ] Clean up any temporary code or comments

**Files to create/update**:
- `specs/student_enrollment/slices/observability/implementation.md`

**Documentation should include**:
- All code changes made
- Dashboard URL (from stack outputs)
- Metrics namespace: `LearnerMax/Backend`
- Available metrics and their meanings
- Alarm configuration details
- How to monitor DLQ
- Testing results
- Any deviations from plan

### Success Criteria
- [ ] implementation.md created and complete
- [ ] Dashboard URL documented
- [ ] All metrics documented
- [ ] Alarm details documented
- [ ] Testing results documented

---

## Rollback Plan

If issues occur during deployment:

1. **Quick rollback**:
```bash
sam deploy --no-confirm-changeset --parameter-overrides $(aws cloudformation describe-stacks --stack-name <stack-name> --query 'Stacks[0].Parameters' --output text)
```

2. **Revert code changes**:
```bash
git checkout HEAD~1 -- backend/
```

3. **Remove dependencies**:
```bash
cd backend
pnpm remove @aws-lambda-powertools/logger @aws-lambda-powertools/metrics @aws-lambda-powertools/tracer
```

---

## Risk Mitigation

1. **ADOT Layer compatibility**: Verify layer ARN for region before deployment
2. **Powertools overhead**: Monitor Lambda duration after deployment
3. **Metrics cost**: Custom metrics incur charges (~$0.30 per metric/month)
4. **Breaking changes**: All changes are additive, no existing functionality removed
5. **Testing**: Comprehensive unit tests prevent regressions

---

## Success Criteria Summary

**Functional**:
- [ ] Sign-in button links to `/signin` page
- [ ] All Lambda functions have ADOT layer
- [ ] All Lambda functions use Powertools Logger
- [ ] Business metrics track user registrations
- [ ] Technical metrics track errors and latency
- [ ] DLQ alarm triggers on messages
- [ ] CloudWatch Dashboard shows all metrics

**Technical**:
- [ ] All unit tests pass (90%+ coverage)
- [ ] TypeScript compiles without errors
- [ ] SAM template validates
- [ ] Preview deployment succeeds
- [ ] Structured logs visible in CloudWatch
- [ ] Metrics visible in CloudWatch
- [ ] Dashboard accessible via URL

**Documentation**:
- [ ] implementation.md complete
- [ ] Dashboard URL documented
- [ ] All metrics documented
- [ ] Testing results documented
