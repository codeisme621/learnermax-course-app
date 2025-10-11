# Research: Observability Implementation and Sign-In Bug

**Date**: 2025-10-08
**Research Question**: What is the current state of observability in the backend Lambda functions and where is the sign-in button bug?

## Summary

This research documents the current state of the LearnerMax application related to:
1. **Frontend Bug**: Sign-in button incorrectly links to `/enroll` instead of `/signin`
2. **Backend Lambda Functions**: 3 Lambda functions exist with basic observability
3. **Current Observability**: X-Ray tracing enabled, JSON logging, Application Insights, but no AWS Lambda Powertools, ADOT layers, or structured logging library
4. **DLQ Configuration**: Only StudentOnboardingFunction has a DLQ configured
5. **Metrics**: No custom CloudWatch metrics or business metrics tracking

---

## Detailed Findings

### 1. Frontend Sign-In Button Bug

**Location**: `frontend/components/layout/Header.tsx:18-20`

**Current Implementation**:
```typescript
<Button variant="ghost" asChild>
  <Link href="/enroll?courseid=course-001">Sign In</Link>
</Button>
```

**Issue**: The "Sign In" button in the header navigation links to the enrollment page (`/enroll?courseid=course-001`) instead of the sign-in page (`/signin`).

**Expected Destination**: `frontend/app/signin/page.tsx` (dedicated sign-in page exists at this path)

**Actual Destination**: `frontend/app/enroll/page.tsx` (enrollment form page)

---

### 2. Backend Lambda Functions

The backend contains **3 Lambda functions**:

#### 2.1 PostConfirmationFunction
**Handler**: `backend/src/lambdas/post-confirmation.ts:21`
**SAM Config**: `backend/template.yaml:203-220`

**Purpose**: Cognito PostConfirmation trigger that publishes student onboarding events to SNS

**Configuration**:
- Runtime: nodejs22.x
- Memory: 256 MB
- Timeout: 10 seconds
- Environment: `SNS_TOPIC_ARN`
- Permissions: SNSPublishMessagePolicy
- DLQ: **None configured**

**Current Logging**:
- Line 24: Logs full Cognito event as JSON
- Line 46: Logs message before SNS publish
- Line 67: Logs success message
- Line 71: Logs errors with console.error

**Error Handling**: Catches errors but doesn't throw (to avoid blocking user sign-up)

---

#### 2.2 StudentOnboardingFunction
**Handler**: `backend/src/lambdas/student-onboarding.ts:28`
**SAM Config**: `backend/template.yaml:230-254`

**Purpose**: Processes student onboarding events from SNS and inserts users into DynamoDB

**Configuration**:
- Runtime: nodejs22.x
- Memory: 512 MB
- Timeout: 30 seconds
- Environment: `STUDENTS_TABLE_NAME`
- Permissions: DynamoDBCrudPolicy on StudentsTable
- DLQ: **StudentOnboardingDLQ** (SQS queue, 14-day retention)
- Trigger: SNS subscription to StudentOnboardingTopic

**Current Logging**:
- Line 29: Logs full SNS event as JSON
- Line 37: Logs each student onboarding message
- Line 58: Logs successful student record creation
- Line 62: Logs duplicate student detection
- Line 66: Logs errors with console.error

**Error Handling**: Throws errors to trigger SNS retry and eventual DLQ routing

**DynamoDB Operation**: Uses `PutCommand` with `attribute_not_exists(userId)` condition (line 54)

---

#### 2.3 ExpressApiFunction
**Handler**: `backend/src/app.ts` (via Lambda Web Adapter)
**SAM Config**: `backend/template.yaml:257-293`

**Purpose**: Express.js API server handling HTTP requests to backend endpoints

**Configuration**:
- Runtime: nodejs22.x
- Memory: 1024 MB
- Timeout: 30 seconds
- Environment: `STUDENTS_TABLE_NAME`, `COURSES_TABLE_NAME`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`
- Permissions: DynamoDBCrudPolicy on StudentsTable and CoursesTable
- DLQ: **None configured**
- Layer: Lambda Web Adapter (arn:aws:lambda:${AWS::Region}:753240598075:layer:LambdaAdapterLayerX86:25)
- Trigger: API Gateway (/{proxy+})

**Current Logging**:
- `backend/src/app.ts:27`: Logs endpoint access with console.info
- `backend/src/routes/students.ts:51,77,107`: Logs errors in route handlers with console.error

---

### 3. Current Observability Implementation

#### 3.1 AWS X-Ray Tracing
**Location**: `backend/template.yaml:378`

**Configuration**:
```yaml
Globals:
  Function:
    Tracing: Active
  Api:
    TracingEnabled: true
```

**Status**: ✅ Enabled globally for all Lambda functions and API Gateway

**Implementation**: Configured via SAM template only - no X-Ray SDK usage in application code

---

#### 3.2 CloudWatch Logs
**Location**: `backend/template.yaml:380-381`

**Configuration**:
```yaml
LoggingConfig:
  LogFormat: JSON
```

**Status**: ✅ JSON log format enabled globally

**Log Groups**: Default AWS-managed log groups at `/aws/lambda/<function-name>`

---

#### 3.3 Application Insights
**Location**: `backend/template.yaml:312-324`

**Configuration**:
- AWS Application Insights with AutoConfiguration enabled
- Monitors all CloudFormation stack resources
- Provides automatic anomaly detection

**Status**: ✅ Configured

---

#### 3.4 Logging Patterns in Code

**Console Logging Used Throughout**:
- `console.log()` for informational messages
- `console.info()` for endpoint access logs
- `console.error()` for error messages
- `JSON.stringify(event, null, 2)` for logging full Lambda events

**Examples**:
- `backend/src/lambdas/post-confirmation.ts:24` - Full event logging
- `backend/src/lambdas/student-onboarding.ts:29` - SNS event logging
- `backend/src/routes/students.ts:51,77,107` - Error logging in API routes

---

#### 3.5 What's NOT Currently Implemented

**Missing Observability Tools**:
- ❌ AWS Lambda Powertools - No imports or usage
- ❌ AWS Lambda OTEL/ADOT Layer - No layer configured on any Lambda
- ❌ Structured Logging Library - No winston, pino, bunyan, or Powertools Logger
- ❌ Custom CloudWatch Metrics - No putMetricData calls or business metrics
- ❌ Manual X-Ray Instrumentation - No X-Ray SDK usage in code
- ❌ CloudWatch Dashboard - No dashboard defined in template
- ❌ DLQ Monitoring/Alerts - No CloudWatch Alarms for DLQ messages

**Dependencies Analysis** (`backend/package.json`):
- Only AWS SDK clients present: `@aws-sdk/client-dynamodb`, `@aws-sdk/client-sns`
- No observability-specific dependencies installed

---

### 4. Dead Letter Queue Configuration

#### 4.1 StudentOnboardingDLQ
**Location**: `backend/template.yaml:191-200`

**Configuration**:
- Type: AWS::SQS::Queue
- Queue Name: `learnermax-student-onboarding-dlq-${Environment}`
- Message Retention: 1,209,600 seconds (14 days)
- Associated Lambda: StudentOnboardingFunction only

**Status**: ✅ Configured for StudentOnboardingFunction (line 247-249)

**Purpose**: Captures failed student onboarding events after SNS retry exhaustion

**Monitoring**: ❌ No CloudWatch Alarms configured to alert when messages arrive in DLQ

---

#### 4.2 Missing DLQ Configuration

**Lambdas Without DLQ**:
- ❌ PostConfirmationFunction - No DLQ configured
- ❌ ExpressApiFunction - No DLQ configured

---

### 5. User Registration Flow (Business Metric Source)

**Flow Architecture**:
1. User confirms account in Cognito
2. Cognito triggers `PostConfirmationFunction` (`backend/src/lambdas/post-confirmation.ts:21`)
3. PostConfirmation extracts user data and publishes to SNS (`post-confirmation.ts:49-65`)
4. SNS delivers to `StudentOnboardingFunction` (`backend/src/lambdas/student-onboarding.ts:28`)
5. StudentOnboarding inserts user into DynamoDB StudentsTable (`student-onboarding.ts:42-56`)

**Success Indicator** (for business metric):
- Location: `backend/src/lambdas/student-onboarding.ts:58`
- Log message: `"Successfully created student record for:", message.email`
- This log entry indicates a successful user registration in DynamoDB

**DynamoDB Table**: StudentsTable (`learnermax-students-${Environment}`)
- Location: `backend/template.yaml:132-158`
- Primary Key: `userId` (String)
- GSI: `email-index`
- Stream: Enabled with `NEW_AND_OLD_IMAGES` (not currently consumed)

**Current Metrics Capability**: ❌ No CloudWatch custom metrics tracking registration count

---

### 6. Infrastructure as Code

**SAM Template**: `backend/template.yaml`

**Key Resources**:
- Lines 203-220: PostConfirmationFunction
- Lines 230-254: StudentOnboardingFunction
- Lines 257-293: ExpressApiFunction
- Lines 132-158: StudentsTable (DynamoDB)
- Lines 161-176: CoursesTable (DynamoDB)
- Lines 179-188: StudentOnboardingTopic (SNS)
- Lines 191-200: StudentOnboardingDLQ (SQS)
- Lines 27-62: LearnerMaxUserPool (Cognito)

**Global Settings** (lines 376-383):
- X-Ray Tracing: Active
- API Tracing: Enabled
- Log Format: JSON

---

## Code References

### Frontend
- `frontend/components/layout/Header.tsx:18-20` - Sign-in button bug location
- `frontend/app/signin/page.tsx` - Correct sign-in page destination
- `frontend/app/enroll/page.tsx` - Incorrect current destination

### Backend Lambda Functions
- `backend/src/lambdas/post-confirmation.ts:21` - PostConfirmation handler
- `backend/src/lambdas/student-onboarding.ts:28` - StudentOnboarding handler
- `backend/src/app.ts` - Express API application

### Infrastructure
- `backend/template.yaml:203-220` - PostConfirmationFunction config
- `backend/template.yaml:230-254` - StudentOnboardingFunction config
- `backend/template.yaml:257-293` - ExpressApiFunction config
- `backend/template.yaml:376-383` - Global observability settings
- `backend/template.yaml:191-200` - DLQ configuration

### Observability Configuration
- `backend/template.yaml:378` - X-Ray tracing enabled
- `backend/template.yaml:380-381` - JSON log format
- `backend/template.yaml:312-324` - Application Insights

### User Registration
- `backend/src/lambdas/student-onboarding.ts:42-56` - DynamoDB insert operation
- `backend/src/lambdas/student-onboarding.ts:58` - Success log (business metric source)
- `backend/template.yaml:132-158` - StudentsTable definition

---

## Architecture Documentation

### Current Observability Stack

**Enabled**:
1. AWS X-Ray distributed tracing (template-level configuration)
2. CloudWatch Logs with JSON format (automatic)
3. AWS Application Insights with auto-configuration
4. Console-based logging (console.log, console.error, console.info)

**Not Enabled**:
1. AWS Lambda Powertools (not installed or configured)
2. AWS Lambda ADOT Layer (not applied to any Lambda)
3. Structured logging library (no Logger instantiation)
4. Custom CloudWatch metrics (no business or technical metrics)
5. CloudWatch Dashboard (not defined)
6. DLQ monitoring alerts (no alarms configured)

### Logging Pattern

All Lambda functions follow this pattern:
- Log full events with `JSON.stringify(event, null, 2)`
- Log key operations with descriptive context
- Log errors with `console.error`
- Rely on CloudWatch Logs for persistence
- No structured logger or correlation IDs

### Error Handling Pattern

**PostConfirmation**:
- Catches errors but doesn't throw
- Prevents blocking Cognito user flow
- Errors logged to CloudWatch only

**StudentOnboarding**:
- Throws errors to trigger SNS retry
- After retries, messages route to DLQ
- Idempotent with ConditionalCheckFailedException handling

**ExpressAPI**:
- Standard try-catch in route handlers
- Returns 500 on errors
- Logs errors to CloudWatch

---

## Open Questions

1. **CloudWatch Dashboard**: What metrics and visualizations should be included in the dashboard?
2. **Business Metrics**: Should metrics track only successful registrations or also failures?
3. **DLQ Alerts**: What threshold should trigger alerts for DLQ messages (any message, or N messages)?
4. **ADOT Layer Configuration**: Should all 3 Lambda functions receive the ADOT layer, or only specific ones?
5. **Powertools Implementation**: Should Powertools Logger, Metrics, and Tracer all be implemented, or a subset?
6. **Correlation IDs**: Should correlation IDs be propagated from PostConfirmation → SNS → StudentOnboarding?
7. **Tech Metrics**: What specific latency thresholds and failure rates should trigger alerts?
8. **Frontend Observability**: Confirming no frontend instrumentation per spec requirements?
