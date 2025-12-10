# Slice 4.3: Email Service & SES Integration

**Parent Mainspec:** `specs/post_enrollment_email/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 4.1 (SNS Topic & Infrastructure - Lambda and permissions must exist)
- Slice 4.2 (React Email Template - email rendering must work)

## Objective
Create the email service that fetches data from DynamoDB (student/course data for enrollments, meetup data for signups), renders the appropriate email template, and sends it via AWS SES. This includes support for email attachments (.ics files) for meetup calendar invites. This completes the email Lambda handler so it can send both enrollment confirmation emails and meetup calendar invite emails.

## What We're Doing

### 1. Configure AWS SES

**⚠️ IMPORTANT: Domain Verification Required for Production**

For production email sending, you **MUST verify your domain** (not just individual email addresses). This is required for:
- SPF/DKIM/DMARC authentication (Gmail/Yahoo 2025 requirements)
- Avoiding spam folders
- Using advanced SES features (configuration sets, custom MAIL FROM)

**❌ DO NOT use Gmail addresses** (e.g., `yourname@gmail.com`) as the sender:
- You cannot configure DNS records for Gmail's domain
- SPF/DKIM will fail (Gmail's records don't include AWS SES)
- Emails will be rejected or marked as spam
- Reference: [AWS SES Identity Verification](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html)

**✅ RECOMMENDED: Verify Domain with Easy DKIM (2048-bit)**

```bash
# Step 1: Verify entire domain (enables sending from any address @learnwithrico.com)
aws ses verify-domain-identity \
  --domain learnwithrico.com \
  --region us-east-1

# Returns verification token for DNS TXT record

# Step 2: Enable Easy DKIM for domain (2048-bit keys - 2025 standard)
aws ses set-identity-dkim-enabled \
  --identity learnwithrico.com \
  --dkim-enabled \
  --region us-east-1

# Step 3: Get DKIM DNS records to add to your domain
aws sesv2 get-email-identity \
  --email-identity learnwithrico.com \
  --region us-east-1
```

**DNS Records Required:**
1. **Domain Verification TXT Record**: Add to `learnwithrico.com` DNS
2. **DKIM CNAME Records** (3 records): Provided by Easy DKIM setup
3. **Custom MAIL FROM** (recommended for SPF alignment):
   ```bash
   # Configure custom MAIL FROM subdomain (e.g., mail.learnwithrico.com)
   aws ses set-identity-mail-from-domain \
     --identity learnwithrico.com \
     --mail-from-domain mail.learnwithrico.com \
     --behavior-on-mx-failure UseDefaultValue \
     --region us-east-1
   ```
   Then add MX and SPF TXT records for `mail.learnwithrico.com`:
   - MX: `10 feedback-smtp.us-east-1.amazonses.com`
   - TXT: `v=spf1 include:amazonses.com ~all`

**For development/testing only (not recommended for production):**

```bash
# Verify individual email address (only for sandbox testing)
aws ses verify-email-identity \
  --email-address support@learnwithrico.com \
  --region us-east-1

# Check verification status
aws ses get-identity-verification-attributes \
  --identities support@learnwithrico.com \
  --region us-east-1
```

**Move out of SES sandbox (production):**

SES starts in sandbox mode with limitations:
- Can only send to verified email addresses
- 200 emails per day limit
- 1 email per second

Request production access:
1. AWS Console → SES → Account dashboard → Request production access
2. Submit use case description
3. Wait for approval (usually 24-48 hours)

### 2. Add SAM Template Parameters

**Update:** `backend/template.yaml` (Parameters section)

Add SES email parameters alongside existing parameters:

```yaml
Parameters:
  Environment:
    Type: String
    Default: preview
    AllowedValues: [preview, prod]
    Description: Environment name (preview or prod)

  FrontendDomain:
    Type: String
    Description: Frontend domain for OAuth callbacks (e.g., https://www.learnwithrico.com)

  SESFromEmail:
    Type: String
    Default: 'support@learnwithrico.com'
    Description: SES verified sender email address

  SESReplyToEmail:
    Type: String
    Default: 'support@learnwithrico.com'
    Description: Reply-to email address for transactional emails

  GoogleOAuthSecretArn:
    Type: String
    Description: ARN of Secrets Manager secret containing Google OAuth credentials

  # ... other existing parameters
```

### 3. Update SAM Config Parameters

**Update:** `backend/samconfig.toml`

Add email parameters to both preview and prod environments:

```toml
[preview.deploy.parameters]
capabilities = "CAPABILITY_IAM"
confirm_changeset = false
resolve_s3 = true
parameter_overrides = [
  "Environment=preview",
  "GoogleOAuthSecretArn=arn:aws:secretsmanager:us-east-1:853219709625:secret:learnermax/google-oauth-15o5Q2",
  "StripeSecretArn=PLACEHOLDER_UPDATE_AFTER_RUNNING_setup-stripe-secrets.sh",
  "FrontendDomain=https://www.learnwithrico.com",
  "SESFromEmail=support@learnwithrico.com",
  "SESReplyToEmail=support@learnwithrico.com"
]

[prod.deploy.parameters]
capabilities = "CAPABILITY_IAM"
confirm_changeset = true
resolve_s3 = true
parameter_overrides = [
  "Environment=prod",
  "GoogleOAuthSecretArn=arn:aws:secretsmanager:us-east-1:853219709625:secret:learnermax/google-oauth-15o5Q2",
  "StripeSecretArn=PLACEHOLDER_UPDATE_AFTER_RUNNING_setup-stripe-secrets.sh",
  "FrontendDomain=https://www.learnwithrico.com",
  "SESFromEmail=support@learnwithrico.com",
  "SESReplyToEmail=support@learnwithrico.com"
]
```

### 4. Update Email Lambda Function

**Update:** `backend/template.yaml` (Resources section)

Update the Email Lambda function to use parameter references:

```yaml
EnrollmentEmailFunction:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: .
    Handler: email/handler.handler
    Runtime: nodejs20.x
    Timeout: 30
    Environment:
      Variables:
        EDUCATION_TABLE_NAME: !Ref EducationTable
        ENROLLMENT_COMPLETED_TOPIC_ARN: !Ref EnrollmentCompletedTopic
        FRONTEND_URL: !Ref FrontendDomain
        SES_FROM_EMAIL: !Ref SESFromEmail
        SES_REPLY_TO_EMAIL: !Ref SESReplyToEmail
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref EducationTable
      - SESCrudPolicy:
          IdentityName: !Ref SESFromEmail
    Events:
      EnrollmentCompletedEvent:
        Type: SNS
        Properties:
          Topic: !Ref EnrollmentCompletedTopic
```

### 5. Create Data Fetching Service

**Create:** `backend/email/data-service.ts`

This service fetches student and course data from DynamoDB:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { EnrollmentCompletedEvent, EnrollmentEmailData } from './types';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
);

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;
const FRONTEND_URL = process.env.FRONTEND_URL!;

/**
 * Fetch student data from DynamoDB
 */
async function getStudent(studentId: string) {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `STUDENT#${studentId}`,
      SK: 'PROFILE'
    }
  });

  const response = await client.send(command);

  if (!response.Item) {
    throw new Error(`Student not found: ${studentId}`);
  }

  return {
    studentId: response.Item.studentId,
    name: response.Item.name,
    email: response.Item.email
  };
}

/**
 * Fetch course data from DynamoDB
 */
async function getCourse(courseId: string) {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `COURSE#${courseId}`,
      SK: 'METADATA'
    }
  });

  const response = await client.send(command);

  if (!response.Item) {
    throw new Error(`Course not found: ${courseId}`);
  }

  return {
    courseId: response.Item.courseId,
    name: response.Item.name,
    description: response.Item.description,
    instructor: response.Item.instructor,
    totalLessons: response.Item.totalLessons,
    estimatedDuration: response.Item.estimatedDuration,
    pricingModel: response.Item.pricingModel
  };
}

/**
 * Format enrollment date for display
 */
function formatEnrollmentDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Prepare email data from enrollment event
 */
export async function prepareEnrollmentEmailData(
  event: EnrollmentCompletedEvent
): Promise<EnrollmentEmailData> {
  // Fetch student and course data in parallel
  const [student, course] = await Promise.all([
    getStudent(event.studentId),
    getCourse(event.courseId)
  ]);

  // Build course URL
  const courseUrl = `${FRONTEND_URL}/course/${course.courseId}`;

  // Format enrollment date
  const enrolledAt = formatEnrollmentDate(event.enrolledAt);

  return {
    studentName: student.name,
    studentEmail: student.email,
    courseName: course.name,
    courseUrl,
    courseDescription: course.description,
    instructor: course.instructor,
    totalLessons: course.totalLessons,
    estimatedDuration: course.estimatedDuration,
    enrolledAt,
    pricingModel: course.pricingModel
  };
}
```

### 6. Create SES Email Service

**Create:** `backend/email/ses-service.ts`

This service sends emails via AWS SES, with support for attachments (for calendar invites):

```typescript
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

const FROM_EMAIL = process.env.SES_FROM_EMAIL!;
const REPLY_TO_EMAIL = process.env.SES_REPLY_TO_EMAIL!;

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Send email via AWS SES with optional attachments
 * Uses SendRawEmailCommand to support MIME multipart messages
 */
export async function sendEmail({
  to,
  subject,
  html,
  attachments = []
}: SendEmailParams): Promise<void> {
  // Build MIME message
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  let rawMessage = [
    `From: ${FROM_EMAIL}`,
    `To: ${to}`,
    `Reply-To: ${REPLY_TO_EMAIL}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    html,
    ''
  ].join('\r\n');

  // Add attachments if present
  for (const attachment of attachments) {
    const base64Content = attachment.content.toString('base64');
    rawMessage += [
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      `Content-Transfer-Encoding: base64`,
      '',
      base64Content,
      ''
    ].join('\r\n');
  }

  rawMessage += `--${boundary}--`;

  const command = new SendRawEmailCommand({
    RawMessage: {
      Data: Buffer.from(rawMessage)
    }
  });

  try {
    const response = await sesClient.send(command);
    console.log('Email sent successfully', {
      messageId: response.MessageId,
      to,
      attachmentCount: attachments.length
    });
  } catch (error) {
    console.error('Failed to send email via SES', {
      error,
      to,
      subject,
      attachmentCount: attachments.length
    });
    throw error;
  }
}
```

### 7. Update Lambda Handler

**Update:** `backend/email/handler.ts`

Integrate all the pieces - data fetching, email rendering, and SES sending:

```typescript
import { SNSEvent, SNSHandler } from 'aws-lambda';
import { renderEmailFromEvent } from './render.js';
import { prepareEnrollmentEmailData } from './data-service.js';
import { sendEmail } from './ses-service.js';
import type { EnrollmentCompletedEvent } from './types';

export const handler: SNSHandler = async (event: SNSEvent) => {
  console.log('Received enrollment event', {
    recordCount: event.Records.length
  });

  for (const record of event.Records) {
    try {
      const enrollmentEvent: EnrollmentCompletedEvent = JSON.parse(record.Sns.Message);

      console.log('Processing enrollment email', {
        studentId: enrollmentEvent.studentId,
        courseId: enrollmentEvent.courseId,
        enrollmentType: enrollmentEvent.enrollmentType,
        source: enrollmentEvent.source
      });

      // 1. Fetch student and course data from DynamoDB
      const emailData = await prepareEnrollmentEmailData(enrollmentEvent);

      console.log('Email data prepared', {
        studentEmail: emailData.studentEmail,
        courseName: emailData.courseName
      });

      // 2. Render email template
      const { html, subject } = await renderEmailFromEvent(
        enrollmentEvent.eventType,
        emailData
      );

      console.log('Email template rendered', {
        subject,
        htmlLength: html.length
      });

      // 3. Send email via SES
      await sendEmail({
        to: emailData.studentEmail,
        subject,
        html
      });

      console.log('Enrollment email sent successfully', {
        studentId: enrollmentEvent.studentId,
        courseId: enrollmentEvent.courseId,
        studentEmail: emailData.studentEmail
      });
    } catch (error) {
      console.error('Failed to process enrollment email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        record: record.Sns.Message
      });

      // Don't throw - we don't want to retry and spam emails
      // Failed emails will be logged for monitoring and manual follow-up
    }
  }
};
```

### 8. Update Email Package Dependencies

**Update:** `backend/email/package.json`

Add AWS SDK dependencies:

```json
{
  "name": "@learnermax/email",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "email dev --dir ./emails --port 3001",
    "build": "tsc",
    "export": "email export"
  },
  "dependencies": {
    "react": "^18.3.1",
    "@react-email/components": "^0.0.25",
    "@react-email/render": "^1.0.1",
    "@aws-sdk/client-dynamodb": "^3.682.0",
    "@aws-sdk/lib-dynamodb": "^3.682.0",
    "@aws-sdk/client-ses": "^3.682.0"
  },
  "devDependencies": {
    "@react-email/cli": "^1.0.3",
    "@types/react": "^18.3.12",
    "@types/aws-lambda": "^8.10.145",
    "typescript": "^5.7.2"
  }
}
```

**Install new dependencies:**
```bash
cd backend/email
pnpm install
```

### 9. Update Email Template Components

**Update:** `backend/email/components/header.tsx`

Update logo URL to use learnwithrico.com:

```tsx
import { Img, Section } from '@react-email/components';

export function Header() {
  return (
    <Section style={headerSection}>
      <Img
        src="https://www.learnwithrico.com/logo.png"
        width="150"
        height="40"
        alt="Learn With Rico"
        style={logo}
      />
    </Section>
  );
}

const headerSection = {
  padding: '20px 0',
  borderBottom: '1px solid #e5e7eb',
  marginBottom: '32px',
};

const logo = {
  margin: '0 auto',
  display: 'block',
};
```

**Update:** `backend/email/components/footer.tsx`

Update links to use learnwithrico.com:

```tsx
import { Section, Text, Hr, Link } from '@react-email/components';

export function Footer() {
  return (
    <>
      <Hr style={divider} />
      <Section style={footerSection}>
        <Text style={footerText}>
          Questions? Reply to this email and we'll be happy to help.
        </Text>
        <Text style={footerText}>
          The Learn With Rico Team
        </Text>
        <Text style={legalText}>
          This is a transactional email confirming your course enrollment.
        </Text>
        <Text style={legalText}>
          <Link href="https://www.learnwithrico.com" style={link}>
            Learn With Rico
          </Link>
          {' • '}
          <Link href="https://www.learnwithrico.com/privacy" style={link}>
            Privacy Policy
          </Link>
          {' • '}
          <Link href="https://www.learnwithrico.com/terms" style={link}>
            Terms of Service
          </Link>
        </Text>
      </Section>
    </>
  );
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footerSection = {
  marginTop: '32px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const legalText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '8px 0',
};

const link = {
  color: '#3b82f6',
  textDecoration: 'none',
};
```

### 10. Test Email Sending

**Manual test with SNS publish:**

```bash
# Get topic ARN
TOPIC_ARN=$(aws cloudformation describe-stacks \
  --stack-name <stack-name> \
  --query 'Stacks[0].Outputs[?OutputKey==`EnrollmentCompletedTopicArn`].OutputValue' \
  --output text)

# Publish test event with real student and course IDs
aws sns publish \
  --topic-arn $TOPIC_ARN \
  --message '{
    "eventType": "EnrollmentCompleted",
    "studentId": "student-123",
    "courseId": "spec-driven-dev-mini",
    "enrollmentType": "free",
    "enrolledAt": "2025-01-15T10:30:00Z",
    "source": "manual"
  }' \
  --subject "Test Enrollment Event"

# Check Lambda logs
aws logs tail /aws/lambda/<function-name> --follow
```

Expected log output:
```
Received enrollment event recordCount=1
Processing enrollment email studentId=student-123 courseId=spec-driven-dev-mini
Email data prepared studentEmail=test@example.com courseName=Spec-Driven Development
Email template rendered subject=Welcome to... htmlLength=12345
Email sent successfully messageId=0102...
Enrollment email sent successfully studentId=student-123
```

**Check email inbox:**
- Student should receive email within 1-2 minutes
- Email should have correct subject line
- Course details should be accurate
- "Start Learning" button should link to `https://www.learnwithrico.com/course/...`

## What We're NOT Doing
- No email queue for retries (failed sends are logged only)
- No email tracking (opens, clicks)
- No email templates storage in S3
- No attachment support
- No batch email sending
- No email scheduling

## Acceptance Criteria

### SES Configuration
- [ ] Sender email verified in SES: `support@learnwithrico.com`
- [ ] Can send test email from SES console
- [ ] SES region configured correctly (us-east-1)
- [ ] For production: Domain verified OR sandbox lifted

### SAM Template Parameters
- [ ] `SESFromEmail` parameter added to template.yaml
- [ ] `SESReplyToEmail` parameter added to template.yaml
- [ ] Parameters have default values
- [ ] Parameters added to samconfig.toml for preview and prod

### SAM Template Lambda Configuration
- [ ] Environment variable: `EDUCATION_TABLE_NAME` uses `!Ref EducationTable`
- [ ] Environment variable: `FRONTEND_URL` uses `!Ref FrontendDomain`
- [ ] Environment variable: `SES_FROM_EMAIL` uses `!Ref SESFromEmail`
- [ ] Environment variable: `SES_REPLY_TO_EMAIL` uses `!Ref SESReplyToEmail`
- [ ] IAM policy grants DynamoDB access to EducationTable
- [ ] IAM policy grants SES send permissions

### Data Fetching Service
- [ ] `data-service.ts` created in email package
- [ ] Uses `EDUCATION_TABLE_NAME` env var
- [ ] `getStudent()` fetches student from DynamoDB
- [ ] `getCourse()` fetches course from DynamoDB
- [ ] `prepareEnrollmentEmailData()` combines data into email format
- [ ] Date formatting works correctly
- [ ] Course URL uses `FRONTEND_URL` env var
- [ ] Handles missing student/course gracefully (throws error)

### SES Email Service
- [ ] `ses-service.ts` created in email package
- [ ] `sendEmail()` sends via AWS SES
- [ ] Uses `SES_FROM_EMAIL` env var
- [ ] Uses `SES_REPLY_TO_EMAIL` env var
- [ ] Logs success with message ID
- [ ] Logs errors with details

### Lambda Handler Integration
- [ ] `handler.ts` imports all services
- [ ] Handler fetches data for each SNS record
- [ ] Handler renders email template
- [ ] Handler sends email via SES
- [ ] Handler logs each step
- [ ] Handler catches errors without throwing (no retry spam)

### Email Template Updates
- [ ] Header logo URL: `https://www.learnwithrico.com/logo.png`
- [ ] Footer links point to `www.learnwithrico.com`
- [ ] Brand name: "Learn With Rico" (not "LearnerMax")

### Dependencies
- [ ] AWS SDK dependencies added to email package.json
- [ ] @types/aws-lambda added as dev dependency
- [ ] Dependencies install successfully
- [ ] Email package builds without errors

### End-to-End Testing
- [ ] Publish test SNS event
- [ ] Lambda invoked successfully
- [ ] Student and course data fetched from DynamoDB
- [ ] Email template rendered
- [ ] Email sent via SES
- [ ] Student receives email in inbox
- [ ] Email content is correct (name, course, links)
- [ ] "Start Learning" button links to `www.learnwithrico.com/course/...`

## Forward-Looking Requirements

### For Slice 4.4 (Enrollment Event Publisher)
- Enrollment API will publish events that trigger this Lambda
- Event payload format must match `EnrollmentCompletedEvent` interface

### For Future Email Types
**Add new email handlers following same pattern:**
```typescript
// Add to data-service.ts
export async function prepareCourseCompletionEmailData(event) { ... }

// Add to render.ts event router
case 'CourseCompleted':
  return renderCourseCompletionEmail(data);

// Handler automatically routes based on eventType
```

### For Production Email Authentication (DMARC)

**Set up DMARC policy for your domain:**

After configuring SPF and DKIM, add a DMARC TXT record to your DNS:

```
_dmarc.learnwithrico.com TXT "v=DMARC1; p=none; rua=mailto:dmarc-reports@learnwithrico.com; pct=100"
```

DMARC policy options:
- `p=none`: Monitor only (start here, collect reports)
- `p=quarantine`: Send failing emails to spam (after monitoring period)
- `p=reject`: Reject failing emails (strictest, use after quarantine period)

**Why DMARC matters (2025 requirements):**
- Gmail and Yahoo require DMARC for bulk senders (5000+ emails/day)
- Improves deliverability and protects against spoofing
- Provides reports on email authentication failures
- Reference: [AWS SES DMARC Compliance](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html)

**Checklist for production email authentication:**
- [ ] Domain verified in SES
- [ ] Easy DKIM enabled (2048-bit)
- [ ] Custom MAIL FROM domain configured
- [ ] SPF record added for MAIL FROM subdomain
- [ ] DMARC policy set to `p=none` initially
- [ ] Monitor DMARC reports for 2-4 weeks
- [ ] Gradually increase DMARC strictness (`p=quarantine`, then `p=reject`)

### For Production Monitoring
**Add CloudWatch metrics:**
```typescript
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

async function trackEmailSent(eventType: string) {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'LearnWithRico/Email',
    MetricData: [{
      MetricName: 'EmailsSent',
      Value: 1,
      Dimensions: [{ Name: 'EventType', Value: eventType }]
    }]
  }));
}
```

### For Different Environments
Parameters allow easy configuration per environment:
```toml
# samconfig.toml - different emails per environment
[preview.deploy.parameters]
SESFromEmail=support-preview@learnwithrico.com

[prod.deploy.parameters]
SESFromEmail=support@learnwithrico.com
```

## Verification Steps

After implementation:

1. **Verify SES setup:**
   ```bash
   # Check email verification status
   aws ses get-identity-verification-attributes \
     --identities support@learnwithrico.com

   # Send test email from console
   aws ses send-email \
     --from support@learnwithrico.com \
     --destination ToAddresses=your-email@example.com \
     --message Subject={Data="Test"},Body={Text={Data="Test email"}}
   ```

2. **Build and deploy:**
   ```bash
   cd backend
   pnpm run build
   sam build
   sam deploy --config-env preview
   ```

3. **Verify parameters deployed:**
   ```bash
   aws lambda get-function-configuration \
     --function-name <function-name> \
     --query 'Environment.Variables'
   ```
   Should show `FRONTEND_URL`, `SES_FROM_EMAIL`, `SES_REPLY_TO_EMAIL`

4. **Publish test event:**
   ```bash
   aws sns publish --topic-arn <topic-arn> --message '{...}'
   ```

5. **Check logs:**
   ```bash
   aws logs tail /aws/lambda/<function-name> --follow
   ```
   Should show: data fetched → template rendered → email sent

6. **Verify email received:**
   - Check inbox for enrollment email
   - Verify from address: `support@learnwithrico.com`
   - Verify links point to `www.learnwithrico.com`
   - Click "Start Learning" button

## User Flow Narrative

**Scenario: Student enrolls and receives welcome email**

1. **Context:** Sarah clicks "Enroll" button. Enrollment API creates enrollment record.

2. **SNS event published:** Enrollment API publishes to SNS.

3. **Lambda invoked:** Email Lambda receives event with configured environment variables from SAM parameters.

4. **Data fetching:** Lambda fetches from EducationTable using `EDUCATION_TABLE_NAME`.

5. **Email rendering:** Template uses `FRONTEND_URL` to build course link: `https://www.learnwithrico.com/course/spec-driven-dev-mini`

6. **Email sent:** SES sends from `support@learnwithrico.com` with reply-to same address.

7. **Email delivered:** Sarah receives email within 1-2 minutes.

8. **Sarah clicks button:** Opens correct URL based on `FRONTEND_URL` parameter.

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May add different email addresses for preview vs prod environments
- May add retry logic for transient SES errors
- May store email send history in DynamoDB
- May add HTML to text email fallback
