# Slice 4.5: Meetup Signup Event Publisher

**Parent Mainspec:** `specs/post_enrollment_email/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 4.1 (SNS Topic & Infrastructure - topic must exist)
- Slice 4.2 (React Email Templates - meetup calendar invite template with .ics generation)
- Slice 4.3 (Email Service & SES Integration - email Lambda must support attachments)

## Objective
Update the meetup signup service to publish SNS events after successfully creating signup records in DynamoDB. This triggers the meetup calendar invite email with .ics attachment, replacing the current placeholder `sendCalendarInvite()` function.

## What We're Doing

### 1. Update Meetup Service to Publish SNS Events

**Update:** `backend/src/features/meetups/meetups.service.ts`

Replace the placeholder calendar invite logging with actual SNS event publishing:

```typescript
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const ENROLLMENT_COMPLETED_TOPIC_ARN = process.env.ENROLLMENT_COMPLETED_TOPIC_ARN!;

/**
 * Sign up user for a meetup and send calendar invite
 */
export async function signupForMeetup(
  userId: string,
  meetupId: string,
  userEmail: string,
  userName: string
): Promise<void> {
  // 1. Create signup record in DynamoDB (idempotent)
  try {
    await meetupsRepository.createSignup(userId, meetupId);
    console.log('Meetup signup created', { userId, meetupId });
  } catch (error: any) {
    // ConditionalCheckFailedException means already signed up
    // This is OK - we still want to send the calendar invite
    if (error.name === 'ConditionalCheckFailedException') {
      console.log('User already signed up for meetup (idempotent)', {
        userId,
        meetupId
      });
    } else {
      throw error;
    }
  }

  // 2. Publish SNS event to trigger calendar invite email
  try {
    await publishMeetupSignupCompletedEvent({
      studentId: userId,
      studentEmail: userEmail,
      studentName: userName,
      meetupId,
      signedUpAt: new Date().toISOString(),
      source: 'manual'
    });

    console.log('Meetup signup event published', {
      userId,
      meetupId,
      userEmail
    });
  } catch (error) {
    // Log error but don't fail the signup
    // Calendar invite can be resent by signing up again (idempotent)
    console.error('Failed to publish meetup signup event', {
      error,
      userId,
      meetupId,
      userEmail
    });
  }
}

/**
 * Publish MeetupSignupCompleted event to SNS
 */
async function publishMeetupSignupCompletedEvent(event: {
  studentId: string;
  studentEmail: string;
  studentName: string;
  meetupId: string;
  signedUpAt: string;
  source: 'manual' | 'auto';
}): Promise<void> {
  const message = {
    eventType: 'MeetupSignupCompleted',
    ...event
  };

  const command = new PublishCommand({
    TopicArn: ENROLLMENT_COMPLETED_TOPIC_ARN,
    Message: JSON.stringify(message),
    Subject: 'Meetup Signup Completed',
    MessageAttributes: {
      eventType: {
        DataType: 'String',
        StringValue: 'MeetupSignupCompleted'
      },
      meetupId: {
        DataType: 'String',
        StringValue: event.meetupId
      },
      studentId: {
        DataType: 'String',
        StringValue: event.studentId
      }
    }
  });

  await snsClient.send(command);
}
```

**Key Changes:**
- Remove the placeholder `sendCalendarInvite()` function at line ~84
- Replace the TODO comment with actual SNS publishing
- Reuse the same SNS topic (`ENROLLMENT_COMPLETED_TOPIC_ARN`) as enrollment emails
- Event payload includes `studentEmail` and `studentName` (already available from JWT claims)
- Event type is `MeetupSignupCompleted` to route to the calendar invite template

### 2. Add SNS Topic ARN to SAM Template

**Update:** `backend/template.yaml`

Grant the main API Lambda (which handles meetup signups) permission to publish to the SNS topic:

```yaml
Resources:
  ExpressApiFunction:
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

**Note:** If the meetup routes are in a separate Lambda function, apply the same changes to that function instead.

### 3. Verify Existing Idempotent Signup Handling

**Review:** `backend/src/features/meetups/meetups.repository.ts`

Confirm the `createSignup()` method already uses `ConditionExpression` for idempotency:

```typescript
export async function createSignup(
  userId: string,
  meetupId: string
): Promise<void> {
  const item: MeetupSignupEntity = {
    PK: `STUDENT#${userId}`,
    SK: `MEETUP_SIGNUP#${meetupId}`,
    meetupId,
    signedUpAt: new Date().toISOString(),
    entityType: 'MEETUP_SIGNUP'
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK)' // Idempotent: fails if already signed up
  }));
}
```

This pattern allows users to "re-sign up" to receive the calendar invite again if they need it.

### 4. Deploy and Test

**Deploy updated backend:**

```bash
cd backend
pnpm run build
sam build
sam deploy
```

**Test meetup signup flow:**

```bash
# 1. Sign up for a meetup via API
curl -X POST https://api.learnermax.com/api/meetups/spec-driven-dev-weekly/signup \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# 2. Check SNS topic for published event
aws sns list-topics | grep enrollment-completed

# 3. Check Lambda logs for email sending
aws logs tail /aws/lambda/EnrollmentEmailFunction --follow

# Expected logs:
# - "Meetup signup created" or "User already signed up (idempotent)"
# - "Meetup signup event published"
# - "Processing email event eventType=MeetupSignupCompleted"
# - "Email sent successfully" with attachmentCount=1
```

**Verify calendar invite email:**
1. Check email inbox for calendar invite
2. Open .ics attachment
3. Verify it opens in calendar app (Google Calendar, Outlook, etc.)
4. Confirm event details: title, date/time, Zoom link, host info

## What We're NOT Doing
- No separate SNS topic for meetup events (reusing enrollment topic)
- No meetup reminder emails (future enhancement)
- No meetup cancellation/update emails
- No recurring calendar series (only single occurrence in .ics)
- No timezone preferences (using meetup's configured timezone)

## Acceptance Criteria

### SNS Event Publishing
- [ ] `signupForMeetup()` publishes SNS event after DynamoDB write
- [ ] Event payload includes all required fields:
  - `eventType: 'MeetupSignupCompleted'`
  - `studentId`, `studentEmail`, `studentName`
  - `meetupId`, `signedUpAt`, `source`
- [ ] SNS publish errors are logged but don't fail signup
- [ ] Idempotent signup still triggers email (allows resending)

### IAM Permissions
- [ ] Main API Lambda has `ENROLLMENT_COMPLETED_TOPIC_ARN` env variable
- [ ] Main API Lambda has SNS publish permission
- [ ] SAM template validates: `sam validate`

### Integration Testing
- [ ] Manual signup triggers SNS event
- [ ] Email Lambda receives `MeetupSignupCompleted` event
- [ ] Email Lambda generates .ics file
- [ ] Email Lambda sends email with attachment
- [ ] Student receives email with .ics attachment
- [ ] .ics file opens in calendar apps (test Google Calendar, Outlook, Apple Calendar)
- [ ] Calendar event has correct: title, date/time, Zoom link, host, duration

### Error Handling
- [ ] SNS publish failure doesn't block signup
- [ ] Duplicate signup (ConditionalCheckFailedException) still sends email
- [ ] Invalid meetup ID returns 404
- [ ] Missing env variable throws clear error

### Logging
- [ ] Signup creation logged
- [ ] SNS event publish logged
- [ ] SNS publish errors logged with context
- [ ] Email Lambda logs event receipt and email sending

## Forward-Looking Requirements

### For Future Meetup Reminder Emails
When implementing reminder emails (e.g., 1 day before meetup):

1. **Add scheduled Lambda:**
   ```yaml
   MeetupReminderFunction:
     Type: AWS::Serverless::Function
     Properties:
       Events:
         DailyCheck:
           Type: Schedule
           Properties:
             Schedule: 'cron(0 10 * * ? *)'  # Daily at 10 AM UTC
   ```

2. **Query upcoming meetups:**
   - Scan `MEETUP_SIGNUP` records
   - Calculate next occurrence for each meetup
   - Filter signups where nextOccurrence is 24 hours away
   - Publish `MeetupReminderDue` SNS event

3. **Create reminder email template:**
   - "Your meetup is tomorrow at [time]"
   - Include Zoom link prominently
   - No .ics attachment (already on calendar)

### For Meetup Cancellation/Rescheduling
When a meetup is cancelled or rescheduled:

1. **Publish `MeetupCancelled` or `MeetupRescheduled` event**
2. **Send cancellation .ics with `STATUS:CANCELLED`**
3. **For reschedule: Send updated .ics with new date/time**

### For Multiple Calendar Services
If adding direct calendar integrations (future):

```typescript
interface CalendarIntegration {
  provider: 'google' | 'outlook' | 'apple';
  accessToken: string;
  refreshToken: string;
}

// Add event directly to user's calendar via API
async function addToGoogleCalendar(event, accessToken) {
  // Use Google Calendar API
}
```

## Verification Steps

After deployment:

1. **Verify environment variable:**
   ```bash
   aws lambda get-function-configuration \
     --function-name <main-api-function-name> \
     --query 'Environment.Variables.ENROLLMENT_COMPLETED_TOPIC_ARN'
   ```

2. **Verify IAM permissions:**
   ```bash
   aws lambda get-policy \
     --function-name <main-api-function-name>
   ```
   Should include SNS publish policy

3. **Test signup flow:**
   - Sign up for meetup via frontend or API
   - Check logs for SNS publish
   - Verify email received
   - Open .ics attachment in calendar app

4. **Test idempotency:**
   - Sign up for same meetup again
   - Verify second email sent (allows resending)
   - Check DynamoDB - should still have only 1 signup record

5. **Test error handling:**
   - Sign up for invalid meetup ID → should return 404
   - Temporarily break SNS topic ARN → signup should succeed, email should fail gracefully

## User Flow Narrative

**Scenario: Student signs up for weekly meetup and receives calendar invite**

1. **User action:** Alex browses the dashboard and sees "Spec Driven Development & Context Engineering" weekly meetup card.

2. **Click signup:** Alex clicks "Sign Up" button.

3. **Frontend call:** `POST /api/meetups/spec-driven-dev-weekly/signup`
   - Auth middleware extracts: `userId`, `userEmail`, `userName` from JWT

4. **Backend processing:**
   - `meetups.service.ts` → `signupForMeetup()` is called
   - DynamoDB record created (or ConditionalCheckFailed if already signed up)
   - SNS event published to `EnrollmentCompletedTopic`:
     ```json
     {
       "eventType": "MeetupSignupCompleted",
       "studentId": "user-123",
       "studentEmail": "alex@example.com",
       "studentName": "Alex Johnson",
       "meetupId": "spec-driven-dev-weekly",
       "signedUpAt": "2025-01-15T10:30:00Z",
       "source": "manual"
     }
     ```

5. **Email Lambda triggered:**
   - Receives SNS event
   - Routes to meetup calendar invite handler
   - Fetches meetup data from `meetups.constants.ts`:
     - Title, description, schedule (Saturday 10 AM CST)
     - Duration (60 min), Zoom link, host info
   - Calculates next occurrence: `2025-01-18T16:00:00.000Z`
   - Generates .ics file using `ics` library:
     ```
     BEGIN:VCALENDAR
     VERSION:2.0
     BEGIN:VEVENT
     DTSTART:20250118T100000
     DURATION:PT1H
     SUMMARY:Spec Driven Development & Context Engineering
     DESCRIPTION:Weekly discussion...
     LOCATION:https://zoom.us/j/XXX
     ORGANIZER:mailto:rico@learnermax.com
     ATTENDEE:mailto:alex@example.com
     STATUS:CONFIRMED
     END:VEVENT
     END:VCALENDAR
     ```
   - Renders React Email template
   - Sends email via SES with .ics attachment

6. **Email received:**
   - Alex receives email: "You're Signed Up! 📅"
   - Email shows:
     - Meetup title and description
     - When: "Saturday, January 18, 2025 at 10:00 AM CST"
     - Duration: 60 minutes
     - Host: Rico Martinez
     - Zoom link
   - .ics file attached: `meetup-spec-driven-dev-weekly.ics`

7. **Add to calendar:**
   - Alex opens .ics attachment
   - Google Calendar launches
   - Event auto-populates with all details
   - Alex clicks "Save" → Event added to calendar
   - Alex receives Google Calendar notification 10 minutes before meetup

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May need to adjust .ics timezone handling for different user timezones
- May add recurring event pattern in .ics (currently single occurrence)
- May need to handle meetup schedule changes (rescheduling logic)
- May want to include "Add to Calendar" links in email body (in addition to .ics)
- May discover need for separate SNS topic if message filtering becomes important
