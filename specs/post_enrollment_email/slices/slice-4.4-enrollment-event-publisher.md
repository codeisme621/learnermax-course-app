# Slice 4.4: Enrollment Event Publisher

**Parent Mainspec:** `specs/post_enrollment_email/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 4.1 (SNS Topic & Infrastructure - topic must exist)
- Slice 4.3 (Email Service & SES Integration - email Lambda must be ready to receive events)

## Objective
Update the enrollment API to publish SNS events after successfully creating enrollment records in DynamoDB. This connects the enrollment flow to the email service, triggering welcome emails for both manual enrollments (user clicks "Enroll" on dashboard) and auto-enrollments (sessionStorage-based enrollment on first dashboard visit).

## What We're Doing

### 1. Update Enrollment Service to Publish SNS Events

**Update:** `backend/src/features/enrollment/enrollment.service.ts`

Add SNS publishing after successful DynamoDB writes:

```typescript
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import type { Enrollment } from './enrollment.types';

const dynamoClient = DynamoDBDocumentClient.from(/* ... */);
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;
const ENROLLMENT_COMPLETED_TOPIC_ARN = process.env.ENROLLMENT_COMPLETED_TOPIC_ARN!;

/**
 * Create enrollment and publish SNS event
 */
export async function createEnrollment(
  userId: string,
  courseId: string,
  enrollmentType: 'free' | 'paid' = 'free'
): Promise<Enrollment> {
  const now = new Date().toISOString();

  const enrollment: Enrollment = {
    PK: `STUDENT#${userId}`,
    SK: `ENROLLMENT#${courseId}`,
    userId,
    courseId,
    enrollmentType,
    enrolledAt: now,
    progress: 0,
    completed: false,
    paymentStatus: enrollmentType === 'free' ? 'free' : 'pending',
    createdAt: now,
    updatedAt: now
  };

  // 1. Write enrollment to DynamoDB
  await dynamoClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: enrollment,
    ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)' // Prevent duplicates
  }));

  console.log('Enrollment created in DynamoDB', {
    userId,
    courseId,
    enrollmentType
  });

  // 2. Publish SNS event
  try {
    await publishEnrollmentCompletedEvent({
      studentId: userId,
      courseId,
      enrollmentType,
      enrolledAt: now,
      source: 'manual' // Both manual and auto-enrollments go through this API
    });

    console.log('Enrollment completed event published', {
      userId,
      courseId
    });
  } catch (error) {
    // Log error but don't fail the enrollment
    // Email can be sent manually if SNS publish fails
    console.error('Failed to publish enrollment event', {
      error,
      userId,
      courseId
    });
  }

  return enrollment;
}

/**
 * Publish EnrollmentCompleted event to SNS
 */
async function publishEnrollmentCompletedEvent(event: {
  studentId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid';
  enrolledAt: string;
  source: 'manual' | 'auto';
}): Promise<void> {
  const message = {
    eventType: 'EnrollmentCompleted',
    ...event
  };

  await snsClient.send(new PublishCommand({
    TopicArn: ENROLLMENT_COMPLETED_TOPIC_ARN,
    Message: JSON.stringify(message),
    Subject: 'Enrollment Completed'
  }));
}
```

### 2. Update IAM Permissions for API Function

**Update:** `backend/template.yaml`

Ensure the API Lambda has SNS publish permissions (should already be added in Slice 4.1, but verify):

```yaml
ApiFunction:
  Type: AWS::Serverless::Function
  Properties:
    # ... existing properties
    Environment:
      Variables:
        EDUCATION_TABLE_NAME: !Ref EducationTable
        ENROLLMENT_COMPLETED_TOPIC_ARN: !Ref EnrollmentCompletedTopic
        # ... other env vars
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref EducationTable
      - SNSPublishMessagePolicy:
          TopicName: !GetAtt EnrollmentCompletedTopic.TopicName
      # ... other policies
```

### 3. Add SNS Client Dependency

**Update:** `backend/package.json`

Add AWS SNS SDK (if not already present):

```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.682.0",
    "@aws-sdk/lib-dynamodb": "^3.682.0",
    "@aws-sdk/client-sns": "^3.682.0",
    // ... other dependencies
  }
}
```

**Install dependency:**
```bash
cd backend
pnpm install
```

## What We're NOT Doing
- No retry logic for failed SNS publishes (logged for manual follow-up)
- No transaction coordination between DynamoDB and SNS (eventual consistency OK)
- No batch publishing (each enrollment publishes individually)
- No SNS message deduplication (each enrollment gets a unique message)
- No delayed email sending (emails sent immediately)
- No distinction between "manual" and "auto" enrollment sources (both use same API endpoint)

## Acceptance Criteria

### Enrollment Service Updates
- [ ] `enrollment.service.ts` imports SNS client
- [ ] `createEnrollment()` publishes SNS event after DynamoDB write
- [ ] Event payload matches `EnrollmentCompletedEvent` interface
- [ ] `source` field set to 'manual' (covers both manual clicks and auto-enrollment)
- [ ] SNS publish failure logged but doesn't fail enrollment
- [ ] Event contains all required fields: eventType, studentId, courseId, enrollmentType, enrolledAt, source

### IAM Permissions
- [ ] API Lambda has `SNSPublishMessagePolicy`
- [ ] API Lambda has `ENROLLMENT_COMPLETED_TOPIC_ARN` env var configured

### Dependencies
- [ ] `@aws-sdk/client-sns` added to backend package.json
- [ ] Dependency installs successfully
- [ ] No TypeScript errors

### End-to-End Testing - Manual Enrollment
- [ ] User clicks "Enroll" on dashboard
- [ ] Enrollment API publishes SNS event
- [ ] Email Lambda receives event and sends email
- [ ] Student receives welcome email
- [ ] Email contains correct student name and course details

### End-to-End Testing - Auto-Enrollment
- [ ] New user signs up and lands on dashboard
- [ ] sessionStorage contains `pendingEnrollmentCourseId`
- [ ] Dashboard calls enrollment API automatically
- [ ] Enrollment API publishes SNS event
- [ ] Email Lambda receives event and sends email
- [ ] Student receives welcome email

## Forward-Looking Requirements

### For Future Paid Enrollments
**When Stripe payment completes:**
```typescript
// After successful payment
await createEnrollment(userId, courseId, 'paid');
// Publishes event with enrollmentType: 'paid'
// Email template can show payment receipt info
```

### For Distinguishing Enrollment Sources (Optional)
**If needed in the future, track enrollment source:**
```typescript
// Add source parameter to createEnrollment
async function createEnrollment(
  userId: string,
  courseId: string,
  enrollmentType: 'free' | 'paid' = 'free',
  source: 'manual' | 'auto' | 'gift' | 'admin' = 'manual'
): Promise<Enrollment>

// Frontend passes source
await enrollInCourse(courseId, { source: 'auto' });
```

### For Transaction Coordination (Advanced)
**If eventual consistency becomes an issue:**
```typescript
// Option 1: DynamoDB Streams → Lambda → SNS
// Option 2: Step Functions for orchestration
// Option 3: SQS for guaranteed delivery with retries
```

## Verification Steps

After implementation:

1. **Build and deploy:**
   ```bash
   cd backend
   pnpm install
   pnpm run build
   sam build
   sam deploy --config-env preview
   ```

2. **Test manual enrollment:**
   ```bash
   # Get auth token
   TOKEN=$(curl -X POST https://api.example.com/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!"}' \
     | jq -r '.token')

   # Enroll in course
   curl -X POST https://api.example.com/api/enrollments \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"courseId":"spec-driven-dev-mini"}'
   ```

3. **Check API Lambda logs:**
   ```bash
   aws logs tail /aws/lambda/<api-function-name> --follow
   ```
   Should show:
   ```
   Enrollment created in DynamoDB userId=... courseId=...
   Enrollment completed event published userId=... courseId=...
   ```

4. **Check Email Lambda logs:**
   ```bash
   aws logs tail /aws/lambda/<email-function-name> --follow
   ```
   Should show:
   ```
   Received enrollment event recordCount=1
   Processing enrollment email studentId=... source=manual
   Email sent successfully messageId=...
   ```

5. **Verify email received:**
   - Check inbox for welcome email
   - Subject should match course name
   - Content should have student name and course details
   - "Start Learning" button should link to course page

6. **Test auto-enrollment flow:**
   - Sign up new user (or use incognito mode)
   - On signup success, sessionStorage is set with `pendingEnrollmentCourseId`
   - Dashboard loads and auto-enrolls (lines 43-58 in DashboardContent.tsx)
   - Same API endpoint called, same SNS event published
   - Email received

## User Flow Narrative

**Scenario 1: Manual enrollment via dashboard**

1. **Context:** Sarah browses the dashboard and sees the mini course. She clicks "Enroll Now."

2. **Frontend API call:**
   ```typescript
   await enrollInCourse('spec-driven-dev-mini');
   // Calls POST /api/enrollments
   ```

3. **Enrollment service:**
   - Writes enrollment to DynamoDB: ✓
   - Publishes to SNS:
     ```json
     {
       "eventType": "EnrollmentCompleted",
       "studentId": "student-789",
       "courseId": "spec-driven-dev-mini",
       "enrollmentType": "free",
       "enrolledAt": "2025-01-15T14:30:00Z",
       "source": "manual"
     }
     ```

4. **Email Lambda invoked:** Receives SNS event, fetches data, renders template, sends email.

5. **Email delivered:** Sarah receives welcome email within 1-2 minutes.

6. **Dashboard updates:** Course card now shows "Continue Learning" instead of "Enroll."

**Scenario 2: Auto-enrollment on first dashboard visit**

1. **Context:** Michael just signed up and completed email verification. Signup flow sets sessionStorage:
   ```typescript
   sessionStorage.setItem('pendingEnrollmentCourseId', 'spec-driven-dev-mini');
   ```

2. **Dashboard loads:** `useEffect` runs (line 37 in DashboardContent.tsx).

3. **Auto-enrollment check (lines 43-58):**
   - Reads `pendingEnrollmentCourseId` from sessionStorage
   - Calls `enrollInCourse('spec-driven-dev-mini')`
   - Clears sessionStorage after attempt

4. **Same enrollment API called:** No difference from manual enrollment on backend.

5. **Enrollment service:**
   - Writes enrollment to DynamoDB: ✓
   - Publishes to SNS: ✓ (source: 'manual')

6. **Email Lambda invoked:** Sends welcome email.

7. **Email delivered:** Michael receives welcome email shortly after landing on dashboard.

**Scenario 3: SNS publish fails**

1. **Context:** Enrollment API creates enrollment, but SNS service is temporarily unavailable.

2. **Enrollment created:** DynamoDB write succeeds.

3. **SNS publish fails:** Error logged:
   ```
   Failed to publish enrollment event
   error: ServiceUnavailable
   userId: student-123
   courseId: spec-driven-dev-mini
   ```

4. **Enrollment still succeeds:** API returns 200 OK to frontend.

5. **User experience:** Student is enrolled and can access course immediately.

6. **Email not sent:** Student doesn't receive welcome email (but enrollment works).

7. **Manual follow-up:** DevOps team sees error in CloudWatch logs. Can:
   - Manually trigger email via SNS publish
   - Wait for automatic retry if configured
   - Send email manually via SES console

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May add SNS publish retry logic with exponential backoff
- May use DynamoDB Streams instead of direct SNS publish for guaranteed delivery
- May add SQS between API and SNS for buffering
- May distinguish 'auto' vs 'manual' enrollment source if analytics needed
- May add idempotency tokens to prevent duplicate emails
- May batch enrollment events if multiple courses enrolled simultaneously
