# Slice 4.1: SNS Topic & Infrastructure

**Parent Mainspec:** `specs/post_enrollment_email/mainspec.md`
**Status:** Not Started
**Depends On:** None (foundational infrastructure)

## Objective
Create the AWS SNS topic for transactional email events (enrollment and meetup signup) and set up the Lambda function that will subscribe to these events. This establishes the event-driven infrastructure needed for sending both enrollment confirmation emails and meetup calendar invite emails, following the same pattern as the existing student onboarding flow.

## What We're Doing

### 1. Create SNS Topic in SAM Template

**Update:** `backend/template.yaml`

Add the EnrollmentCompleted SNS topic to the SAM template:

```yaml
Resources:
  # Existing resources...

  # SNS Topic for Transactional Email Events (Enrollment & Meetup Signup)
  EnrollmentCompletedTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub '${AWS::StackName}-enrollment-completed'
      DisplayName: Transactional Email Events (Enrollment & Meetup)
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Feature
          Value: TransactionalEmail

  # Lambda Function for Transactional Emails (Enrollment & Meetup)
  EnrollmentEmailFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: .
      Handler: email/handler.handler
      Runtime: nodejs20.x
      Timeout: 30
      Environment:
        Variables:
          TABLE_NAME: !Ref CoursesTable
          ENROLLMENT_COMPLETED_TOPIC_ARN: !Ref EnrollmentCompletedTopic
          FRONTEND_URL: !Ref FrontendUrl
          SES_FROM_EMAIL: !Ref SESFromEmail
          SES_REPLY_TO_EMAIL: !Ref SESReplyToEmail
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref CoursesTable
        - SESCrudPolicy:
            IdentityName: !Ref SESFromEmail
      Events:
        TransactionalEmailEvent:
          Type: SNS
          Properties:
            Topic: !Ref EnrollmentCompletedTopic

  # Output the topic ARN for use by other functions
  EnrollmentCompletedTopicArn:
    Type: AWS::SSM::Parameter
    Properties:
      Name: !Sub '/${AWS::StackName}/sns/enrollment-completed-topic-arn'
      Type: String
      Value: !Ref EnrollmentCompletedTopic
      Description: ARN of the Enrollment Completed SNS topic

# Add to Outputs section
Outputs:
  EnrollmentCompletedTopicArn:
    Description: ARN of the Enrollment Completed SNS Topic
    Value: !Ref EnrollmentCompletedTopic
    Export:
      Name: !Sub '${AWS::StackName}-EnrollmentCompletedTopicArn'
```

### 2. Add SAM Template Parameters

**Update:** `backend/template.yaml` (Parameters section)

Add required parameters for email configuration:

```yaml
Parameters:
  # Existing parameters...

  FrontendUrl:
    Type: String
    Default: 'https://learnermax.com'
    Description: Frontend base URL for course links in emails

  SESFromEmail:
    Type: String
    Default: 'noreply@learnermax.com'
    Description: SES verified sender email address

  SESReplyToEmail:
    Type: String
    Default: 'support@learnermax.com'
    Description: Reply-to email address for enrollment emails

  Environment:
    Type: String
    Default: 'dev'
    AllowedValues:
      - dev
      - staging
      - production
    Description: Environment name
```

### 3. Update Enrollment API IAM Permissions

**Update:** `backend/template.yaml`

Grant the enrollment API Lambda permission to publish to SNS topic:

```yaml
Resources:
  # Find the existing enrollment API function (e.g., ApiFunction or EnrollmentFunction)
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      # ... existing properties
      Environment:
        Variables:
          # ... existing variables
          ENROLLMENT_COMPLETED_TOPIC_ARN: !Ref EnrollmentCompletedTopic
      Policies:
        # ... existing policies
        - SNSPublishMessagePolicy:
            TopicName: !GetAtt EnrollmentCompletedTopic.TopicName
```

### 4. Create Email Package Directory Structure

**Create directory structure:**
```
backend/
└── email/
    ├── handler.ts        # Lambda handler (SNS subscriber)
    ├── types.ts
    └── package.json      # Will be created in Slice 4.2
```

### 5. Create Placeholder Email Handler Lambda

**Create:** `backend/email/handler.ts`

Create a basic Lambda handler that will be enhanced in later slices. This handler lives in the email package alongside the email rendering logic, making the email package a complete, self-contained unit.

```typescript
import { SNSEvent, SNSHandler } from 'aws-lambda';

interface EnrollmentCompletedEvent {
  eventType: 'EnrollmentCompleted';
  studentId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid';
  enrolledAt: string;
  source: 'manual' | 'auto';
}

interface MeetupSignupCompletedEvent {
  eventType: 'MeetupSignupCompleted';
  studentId: string;
  studentEmail: string;
  studentName: string;
  meetupId: string;
  signedUpAt: string;
  source: 'manual' | 'auto';
}

type TransactionalEmailEvent = EnrollmentCompletedEvent | MeetupSignupCompletedEvent;

export const handler: SNSHandler = async (event: SNSEvent) => {
  console.log('Received transactional email event', {
    recordCount: event.Records.length
  });

  for (const record of event.Records) {
    try {
      const emailEvent: TransactionalEmailEvent = JSON.parse(record.Sns.Message);

      console.log('Processing email event', {
        eventType: emailEvent.eventType
      });

      if (emailEvent.eventType === 'EnrollmentCompleted') {
        console.log('Processing enrollment email', {
          studentId: emailEvent.studentId,
          courseId: emailEvent.courseId,
          enrollmentType: emailEvent.enrollmentType,
          source: emailEvent.source
        });

        // TODO: Fetch student and course data (Slice 4.3)
        // TODO: Render enrollment email template (Slice 4.2)
        // TODO: Send email via SES (Slice 4.3)

        console.log('Enrollment email sent successfully', {
          studentId: emailEvent.studentId,
          courseId: emailEvent.courseId
        });
      } else if (emailEvent.eventType === 'MeetupSignupCompleted') {
        console.log('Processing meetup calendar invite email', {
          studentId: emailEvent.studentId,
          meetupId: emailEvent.meetupId
        });

        // TODO: Fetch meetup data (Slice 4.3)
        // TODO: Generate .ics file (Slice 4.2)
        // TODO: Render meetup calendar invite email template (Slice 4.2)
        // TODO: Send email with .ics attachment via SES (Slice 4.3)

        console.log('Meetup calendar invite email sent successfully', {
          studentId: emailEvent.studentId,
          meetupId: emailEvent.meetupId
        });
      } else {
        console.warn('Unknown event type', {
          eventType: (emailEvent as any).eventType
        });
      }
    } catch (error) {
      console.error('Failed to process email event', {
        error,
        record: record.Sns.Message
      });
      // Don't throw - we don't want to retry and spam emails
      // Log error for monitoring and alerting
    }
  }
};
```

**Create:** `backend/email/types.ts`

```typescript
export interface EnrollmentCompletedEvent {
  eventType: 'EnrollmentCompleted';
  studentId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid';
  enrolledAt: string;
  source: 'manual' | 'auto';
}

export interface MeetupSignupCompletedEvent {
  eventType: 'MeetupSignupCompleted';
  studentId: string;
  studentEmail: string;
  studentName: string;
  meetupId: string;
  signedUpAt: string;
  source: 'manual' | 'auto';
}

export type TransactionalEmailEvent = EnrollmentCompletedEvent | MeetupSignupCompletedEvent;
```

### 6. Deploy and Verify Infrastructure

**Deploy updated SAM template:**

```bash
cd backend
pnpm run build
sam build
sam deploy
```

**Verify resources created:**

```bash
# Check SNS topic exists
aws sns list-topics --query 'Topics[?contains(TopicArn, `enrollment-completed`)]'

# Get topic ARN
aws cloudformation describe-stacks \
  --stack-name <stack-name> \
  --query 'Stacks[0].Outputs[?OutputKey==`EnrollmentCompletedTopicArn`].OutputValue' \
  --output text

# Check Lambda subscription
aws sns list-subscriptions-by-topic \
  --topic-arn <topic-arn>
```

### 7. Test SNS Topic with Manual Publish

**Test event publishing:**

```bash
# Get topic ARN from stack outputs
TOPIC_ARN=$(aws cloudformation describe-stacks \
  --stack-name <stack-name> \
  --query 'Stacks[0].Outputs[?OutputKey==`EnrollmentCompletedTopicArn`].OutputValue' \
  --output text)

# Test 1: Publish enrollment event
aws sns publish \
  --topic-arn $TOPIC_ARN \
  --message '{
    "eventType": "EnrollmentCompleted",
    "studentId": "student-test-123",
    "courseId": "spec-driven-dev-mini",
    "enrollmentType": "free",
    "enrolledAt": "2025-01-15T10:30:00Z",
    "source": "manual"
  }' \
  --subject "Test Enrollment Event"

# Test 2: Publish meetup signup event
aws sns publish \
  --topic-arn $TOPIC_ARN \
  --message '{
    "eventType": "MeetupSignupCompleted",
    "studentId": "student-test-123",
    "studentEmail": "test@example.com",
    "studentName": "Test User",
    "meetupId": "spec-driven-dev-weekly",
    "signedUpAt": "2025-01-15T10:30:00Z",
    "source": "manual"
  }' \
  --subject "Test Meetup Signup Event"

# Check Lambda logs
aws logs tail /aws/lambda/<function-name> --follow
```

Expected log output for enrollment event:
```
Received transactional email event recordCount=1
Processing email event eventType=EnrollmentCompleted
Processing enrollment email studentId=student-test-123 courseId=spec-driven-dev-mini
Enrollment email sent successfully studentId=student-test-123
```

Expected log output for meetup signup event:
```
Received transactional email event recordCount=1
Processing email event eventType=MeetupSignupCompleted
Processing meetup calendar invite email studentId=student-test-123 meetupId=spec-driven-dev-weekly
Meetup calendar invite email sent successfully studentId=student-test-123
```

## What We're NOT Doing
- No Dead Letter Queue (DLQ) for failed messages (can add later)
- No SNS message filtering (all enrollments trigger emails)
- No retry logic (SES sends are idempotent)
- No CloudWatch alarms (monitoring can be added later)
- No separate topics for free vs paid enrollments

## Acceptance Criteria

### SNS Topic
- [ ] EnrollmentCompletedTopic created in SAM template
- [ ] Topic name follows pattern: `{StackName}-enrollment-completed`
- [ ] Topic ARN exported in CloudFormation outputs
- [ ] Topic ARN stored in SSM Parameter Store

### Lambda Function
- [ ] EnrollmentEmailFunction created in SAM template
- [ ] Function subscribed to EnrollmentCompletedTopic via SNS event
- [ ] Function has DynamoDB read permissions
- [ ] Function has SES send permissions
- [ ] Function has environment variables configured
- [ ] Function timeout set to 30 seconds

### IAM Permissions
- [ ] Enrollment API Lambda can publish to SNS topic
- [ ] Email Lambda can read from DynamoDB
- [ ] Email Lambda can send emails via SES
- [ ] SNS can invoke Email Lambda

### Environment Variables
- [ ] `TABLE_NAME` configured
- [ ] `ENROLLMENT_COMPLETED_TOPIC_ARN` configured
- [ ] `FRONTEND_URL` configured
- [ ] `SES_FROM_EMAIL` configured
- [ ] `SES_REPLY_TO_EMAIL` configured

### Testing
- [ ] SAM template validates: `sam validate`
- [ ] Stack deploys successfully
- [ ] SNS topic appears in AWS console
- [ ] Lambda subscription active
- [ ] Manual SNS publish triggers Lambda
- [ ] Lambda logs show event received

## Forward-Looking Requirements

### For Slice 4.4 (Enrollment Event Publisher)
- Enrollment API will publish to `ENROLLMENT_COMPLETED_TOPIC_ARN`
- Event payload must match `EnrollmentCompletedEvent` interface

### For Slice 4.5 (Email Lambda Handler)
- Lambda handler will be enhanced to:
  - Fetch student and course data from DynamoDB
  - Render React Email template
  - Send email via SES

### For Future Monitoring
**Add CloudWatch alarms:**
```yaml
EnrollmentEmailErrorAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: EnrollmentEmailErrors
    MetricName: Errors
    Namespace: AWS/Lambda
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 5
    ComparisonOperator: GreaterThanThreshold
```

**Add DLQ for failed messages:**
```yaml
EnrollmentCompletedDeadLetterQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: enrollment-completed-dlq

EnrollmentCompletedTopic:
  Type: AWS::SNS::Topic
  Properties:
    Subscription:
      - Endpoint: !GetAtt EnrollmentCompletedDeadLetterQueue.Arn
        Protocol: sqs
```

## Verification Steps

After deployment:

1. **Verify SNS topic created:**
   ```bash
   aws sns list-topics | grep enrollment-completed
   ```

2. **Verify Lambda function created:**
   ```bash
   aws lambda list-functions | grep EnrollmentEmail
   ```

3. **Verify Lambda subscription:**
   ```bash
   aws sns list-subscriptions-by-topic --topic-arn <topic-arn>
   ```
   Should show Lambda function subscribed with protocol: `lambda`

4. **Test event flow:**
   ```bash
   # Publish test event
   aws sns publish --topic-arn <topic-arn> --message '{...test event...}'

   # Check logs immediately
   aws logs tail /aws/lambda/<function-name> --follow
   ```

5. **Verify environment variables:**
   ```bash
   aws lambda get-function-configuration \
     --function-name <function-name> \
     --query 'Environment.Variables'
   ```

## User Flow Narrative

**Scenario: Infrastructure ready for enrollment events**

1. **Context:** The enrollment infrastructure is being set up. We need event-driven architecture to handle enrollment emails asynchronously.

2. **SNS topic created:** CloudFormation creates the `EnrollmentCompletedTopic` with ARN:
   ```
   arn:aws:sns:us-east-1:123456789012:learnermax-dev-enrollment-completed
   ```

3. **Lambda subscribed:** The `EnrollmentEmailFunction` is automatically subscribed to the topic. When any message is published, the Lambda will be invoked.

4. **Enrollment API updated:** The enrollment API Lambda now has the topic ARN in its environment variables and permission to publish messages.

5. **Test publish:** DevOps engineer publishes a test enrollment event:
   ```json
   {
     "eventType": "EnrollmentCompleted",
     "studentId": "student-test-123",
     "courseId": "spec-driven-dev-mini",
     "enrollmentType": "free",
     "enrolledAt": "2025-01-15T10:30:00Z",
     "source": "manual"
   }
   ```

6. **Lambda invoked:** Within seconds, the Lambda function is triggered. Logs show:
   ```
   [INFO] Received enrollment event recordCount=1
   [INFO] Processing enrollment email studentId=student-test-123
   [INFO] Enrollment email sent successfully
   ```

7. **Infrastructure validated:** The event-driven architecture is working. Ready for next slices to implement actual email rendering and sending.

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May need to adjust Lambda timeout based on SES sending time
- May add message filtering to SNS topic
- May add DLQ if email failures become common
- May separate topics for different enrollment types
- May add X-Ray tracing for debugging
