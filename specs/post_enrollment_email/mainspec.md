# Feature - Transactional Email System

## Background
Phase 1 built the platform, Phase 2 created the mini course, Phase 3 added premium course teaser. Now we need transactional email capabilities to improve the student experience. This includes sending welcome emails when students enroll in courses and calendar invites when they sign up for meetups.

These emails are transactional (not marketing), sent immediately after key student actions, and provide clear next steps and relevant information.

## User Stories

### Enrollment Confirmation Email
As a student who just enrolled in a course, I want to receive a confirmation email that welcomes me, confirms my enrollment, and provides a direct link to access the course. This gives me confidence that my enrollment was successful and makes it easy to return to the course later without navigating through the platform.

### Meetup Calendar Invite Email
As a student who just signed up for a meetup, I want to receive a calendar invite email with an .ics attachment so I can easily add the meetup to my calendar (Google Calendar, Outlook, Apple Calendar, etc.). The invite should include the Zoom link, meetup description, and schedule details so I have all the information I need to attend.

## What We're Building
1. **SNS Topic & Subscription** - Event topics for enrollment and meetup signup with Lambda subscriber
2. **Email Templates (React Email)** - HTML email templates using @react-email/components:
   - Enrollment confirmation email
   - Meetup calendar invite email with .ics attachment
3. **Email Service** - AWS SES integration for sending emails with attachments
4. **Event Publishers** - Publish to SNS after successful actions:
   - Enrollment completion
   - Meetup signup
5. **Email Lambda Handler** - Subscribe to events and send appropriate emails
6. **Calendar Invite Generator** - .ics file generation for meetup invites (RFC 5545 compliant)

## What We're NOT Building
- No email campaign management (drip campaigns, sequences)
- No email preferences/unsubscribe (transactional only, legally required)
- No HTML email builder UI
- No email analytics (open rates, click tracking)
- No multi-language email support (English only for MVP)
- No premium course launch notification emails (future feature)
- No meetup reminder emails (1 day before, 1 hour before) - only immediate signup confirmation
- No meetup cancellation/rescheduling emails (future enhancement)
- No calendar service API integrations (Google Calendar API, Outlook API) - just .ics file attachment

## Tech Details

### Architecture Flow

#### Flow 1: Enrollment Confirmation Email
**Student enrolls in course (manual or auto-enroll):**
1. **Manual enrollment:** Student clicks "Enroll" button on dashboard
   - Frontend calls `POST /api/enrollments` → Creates enrollment record
2. **Auto-enrollment:** New student created via Cognito post-confirmation trigger
   - Student onboarding Lambda auto-enrolls in free courses
3. Backend writes enrollment record to DynamoDB
4. Backend publishes SNS event to "EnrollmentCompleted" topic:
   ```json
   {
     "eventType": "EnrollmentCompleted",
     "studentId": "student-123",
     "courseId": "spec-driven-dev-mini",
     "enrollmentType": "free",
     "enrolledAt": "2025-01-15T10:30:00Z",
     "source": "manual"
   }
   ```
5. Enrollment Email Lambda subscribed to SNS topic receives event
6. Lambda fetches student and course data from DynamoDB
7. Lambda renders React Email template with data
8. Lambda sends email via AWS SES
9. Student receives email within 1-2 minutes

#### Flow 2: Meetup Calendar Invite Email
**Student signs up for meetup:**
1. Student clicks "Sign Up" button on meetup card
   - Frontend calls `POST /api/meetups/:meetupId/signup` → Creates signup record
2. Backend writes signup record to DynamoDB (idempotent)
3. Backend publishes SNS event to "EnrollmentCompleted" topic (reuses existing infrastructure):
   ```json
   {
     "eventType": "MeetupSignupCompleted",
     "studentId": "student-123",
     "studentEmail": "alex@example.com",
     "studentName": "Alex Johnson",
     "meetupId": "spec-driven-dev-weekly",
     "signedUpAt": "2025-01-15T10:30:00Z",
     "source": "manual"
   }
   ```
4. Email Lambda subscribed to SNS topic receives event
5. Lambda fetches meetup data (title, description, schedule, Zoom link, host info)
6. Lambda generates .ics file (RFC 5545 compliant) with:
   - Event title, description, location (Zoom link)
   - Start/end time (calculated from recurring schedule + duration)
   - Organizer (host email) and attendee (student email)
7. Lambda renders React Email template with meetup data
8. Lambda sends email via AWS SES with .ics attachment
9. Student receives email with calendar invite within 1-2 minutes
10. Student opens .ics file to add to their calendar

**Event-driven architecture (unified for both email types):**
```
Enrollment API → DynamoDB Write → SNS Topic "EnrollmentCompleted" (event: EnrollmentCompleted)
Meetup API     → DynamoDB Write → SNS Topic "EnrollmentCompleted" (event: MeetupSignupCompleted)
                                              ↓
                                      Email Lambda (subscribed)
                                              ↓
                                     Route by eventType
                                    /                  \
                    EnrollmentCompleted         MeetupSignupCompleted
                           ↓                            ↓
                 Render enrollment email      Generate .ics + render meetup email
                           ↓                            ↓
                      AWS SES                       AWS SES (with attachment)
                           ↓                            ↓
                   Enrollment email                Calendar invite email
```

**This mirrors the existing student onboarding pattern:**
```
Cognito Post-Confirmation → SNS Topic "NewStudentOnboarding"
                                   ↓
                            Student Onboarding Lambda
                                   ↓
                            DynamoDB (create student + auto-enroll)
                                   ↓
                            Triggers "EnrollmentCompleted" event
```

### Domain Language
- **Enrollment Event**: SNS message published after successful enrollment
- **Meetup Signup Event**: SNS message published after successful meetup signup
- **EnrollmentCompleted Topic**: SNS topic for transactional email events (handles both enrollment and meetup signup)
- **Transactional Email**: System-generated email triggered by user action (enrollment, signup, etc.)
- **React Email**: React-based email template framework (@react-email/components)
- **Auto-Enrollment**: Automatic enrollment for free courses during student onboarding
- **Manual Enrollment**: User-initiated enrollment via "Enroll" button
- **Calendar Invite**: .ics file attachment that allows adding event to calendar apps
- **ICS File**: iCalendar format file (RFC 5545) for calendar events

## Data Requirements

### SNS Event Payloads

#### Enrollment Completed Event
```typescript
interface EnrollmentCompletedEvent {
  eventType: "EnrollmentCompleted";
  studentId: string;           // "student-123"
  courseId: string;            // "spec-driven-dev-mini"
  enrollmentType: "free" | "paid";
  enrolledAt: string;          // ISO timestamp
  source: "manual" | "auto";   // How enrollment happened
}
```

#### Meetup Signup Completed Event
```typescript
interface MeetupSignupCompletedEvent {
  eventType: "MeetupSignupCompleted";
  studentId: string;           // "student-123"
  studentEmail: string;        // "alex@example.com"
  studentName: string;         // "Alex Johnson"
  meetupId: string;            // "spec-driven-dev-weekly"
  signedUpAt: string;          // ISO timestamp
  source: "manual" | "auto";   // How signup happened (manual for MVP)
}
```

### Email Template Data (fetched by Lambda)

#### Enrollment Email Data
```typescript
interface EnrollmentEmailData {
  studentName: string;           // "Alex Johnson"
  studentEmail: string;          // "alex@example.com"
  courseName: string;            // "Spec-Driven Development with Context Engineering"
  courseUrl: string;             // "https://learnermax.com/course/spec-driven-dev-mini"
  courseDescription: string;     // Brief course description
  instructor: string;            // "Rico Romero"
  totalLessons: number;          // 3
  estimatedDuration: string;     // "45 minutes"
  enrolledAt: string;            // "January 15, 2025"
}
```

#### Meetup Calendar Invite Email Data
```typescript
interface MeetupCalendarInviteData {
  studentName: string;           // "Alex Johnson"
  studentEmail: string;          // "alex@example.com"
  meetupTitle: string;           // "Spec Driven Development & Context Engineering"
  meetupDescription: string;     // Reuse from meetups.constants.ts
  nextOccurrence: string;        // "2025-01-18T16:00:00.000Z" (ISO timestamp)
  formattedDateTime: string;     // "Saturday, January 18, 2025 at 10:00 AM CST"
  duration: number;              // 60 (minutes)
  zoomLink: string;              // "https://zoom.us/j/XXXXXXXXXX"
  hostName: string;              // "Rico Martinez"
  hostEmail: string;             // "rico@learnermax.com"
  icsAttachment: Buffer;         // Generated .ics file as Buffer
  icsFilename: string;           // "meetup-spec-driven-dev-weekly.ics"
}
```

### React Email Template Structure
Using `@react-email/components`:

#### Enrollment Email Template
```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
  Hr,
  Img
} from '@react-email/components';

export default function EnrollmentEmail({ data }: { data: EnrollmentEmailData }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Img src="https://learnermax.com/logo.png" alt="LearnerMax" />
          <Heading>Welcome to {data.courseName}! 🎉</Heading>
          <Text>Hi {data.studentName},</Text>
          <Text>You're all set to start learning. Your enrollment is confirmed...</Text>

          <Section>
            {/* Course card */}
          </Section>

          <Button href={data.courseUrl}>Start Learning</Button>
        </Container>
      </Body>
    </Html>
  );
}
```

#### Meetup Calendar Invite Email Template
```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
  Hr,
  Img
} from '@react-email/components';

export default function MeetupCalendarInviteEmail({
  data
}: {
  data: MeetupCalendarInviteData
}) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Img src="https://learnermax.com/logo.png" alt="LearnerMax" />
          <Heading>You're Signed Up for {data.meetupTitle}! 📅</Heading>
          <Text>Hi {data.studentName},</Text>
          <Text>
            You're all set for our weekly meetup. We've attached a calendar
            invite (.ics file) to this email so you can add it to your calendar.
          </Text>

          <Section>
            {/* Meetup details card */}
            <Heading as="h2">Meetup Details</Heading>
            <Text><strong>When:</strong> {data.formattedDateTime}</Text>
            <Text><strong>Duration:</strong> {data.duration} minutes</Text>
            <Text><strong>Host:</strong> {data.hostName}</Text>
          </Section>

          <Section>
            <Heading as="h3">About This Meetup</Heading>
            <Text>{data.meetupDescription}</Text>
          </Section>

          <Section>
            <Text>
              <strong>Zoom Link:</strong> {data.zoomLink}
            </Text>
            <Text style={{ fontSize: '12px', color: '#666' }}>
              Note: The Zoom link is also included in the calendar invite attachment.
            </Text>
          </Section>

          <Hr />
          <Text style={{ fontSize: '12px', color: '#666' }}>
            To add this meetup to your calendar, open the attached .ics file.
            It works with Google Calendar, Outlook, Apple Calendar, and most other calendar apps.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### ICS File Generation
Use the `ics` npm package (https://www.npmjs.com/package/ics) for generating RFC 5545 compliant calendar files:

```typescript
import { createEvent, EventAttributes } from 'ics';

const event: EventAttributes = {
  start: [2025, 1, 18, 10, 0],  // Year, Month (1-indexed), Day, Hour, Minute
  duration: { minutes: 60 },
  title: 'Spec Driven Development & Context Engineering',
  description: 'Weekly discussion on spec-driven workflows...',
  location: 'https://zoom.us/j/XXXXXXXXXX',
  url: 'https://zoom.us/j/XXXXXXXXXX',
  organizer: { name: 'Rico Martinez', email: 'rico@learnermax.com' },
  attendees: [
    { name: 'Alex Johnson', email: 'alex@example.com', rsvp: true }
  ],
  status: 'CONFIRMED',
  busyStatus: 'BUSY',
};

const { error, value } = createEvent(event);
if (error) {
  throw new Error('Failed to generate .ics file');
}

const icsBuffer = Buffer.from(value, 'utf-8');
```

### AWS SES Configuration
```typescript
{
  region: "us-east-1",
  from: "LearnerMax <noreply@learnermax.com>",
  replyTo: "support@learnermax.com",
  configurationSet: "learnermax-transactional", // For tracking bounces
  tags: [
    { Name: "EmailType", Value: "enrollment" }, // or "meetup-invite"
    { Name: "Environment", Value: "production" }
  ]
}
```

**For emails with attachments (meetup invites):**
```typescript
{
  // ... same config as above
  attachments: [
    {
      filename: 'meetup-spec-driven-dev-weekly.ics',
      content: icsBuffer,
      contentType: 'text/calendar; charset=utf-8; method=REQUEST'
    }
  ]
}
```

### AWS SNS Topic Configuration
```yaml
# In SAM template.yaml
EnrollmentCompletedTopic:
  Type: AWS::SNS::Topic
  Properties:
    TopicName: learnermax-enrollment-completed
    DisplayName: Enrollment Completed Events

EnrollmentEmailLambda:
  Type: AWS::Serverless::Function
  Properties:
    Handler: enrollment-email-handler.handler
    Events:
      EnrollmentEvent:
        Type: SNS
        Properties:
          Topic: !Ref EnrollmentCompletedTopic
```

## Forward-Looking Requirements

### For Auto-Enrollment Flow
**Student onboarding Lambda should publish enrollment events:**
```typescript
// After auto-enrolling in free courses
for (const courseId of freeCourses) {
  await enrollStudent(studentId, courseId);

  // Publish enrollment event
  await sns.publish({
    TopicArn: process.env.ENROLLMENT_COMPLETED_TOPIC_ARN,
    Message: JSON.stringify({
      eventType: "EnrollmentCompleted",
      studentId,
      courseId,
      enrollmentType: "free",
      enrolledAt: new Date().toISOString(),
      source: "auto"
    })
  });
}
```

### For Future Premium Course Enrollment
**Paid enrollment flow will also publish to same topic:**
```typescript
// After successful Stripe payment
await createEnrollment(studentId, courseId, "paid");

await sns.publish({
  TopicArn: process.env.ENROLLMENT_COMPLETED_TOPIC_ARN,
  Message: JSON.stringify({
    eventType: "EnrollmentCompleted",
    studentId,
    courseId,
    enrollmentType: "paid",
    enrolledAt: new Date().toISOString(),
    source: "manual",
    paymentIntentId: "pi_123"  // Additional field for paid
  })
});
```

### For Future Email Types
**Additional email types (post-MVP):**
- Course completion email (with certificate)
- Progress reminder email ("You're 50% done!")
- Premium course launch announcement (to early access list)
- Password reset email (if needed)

**Pattern for new email types:**
```typescript
// New SNS topics following same pattern
- CourseCompletedTopic → CourseCompletionEmailLambda
- ProgressMilestoneTopic → ProgressReminderEmailLambda
- PremiumLaunchTopic → PremiumLaunchEmailLambda
```

## Slices Breakdown

1. **Slice 4.1: SNS Topic & Infrastructure** - Create EnrollmentCompleted topic and Lambda subscription (supports both enrollment and meetup events)
2. **Slice 4.2: React Email Templates** - Build email templates using @react-email/components:
   - Enrollment confirmation email
   - Meetup calendar invite email with .ics generation
3. **Slice 4.3: Email Service & SES Integration** - Create email service with SES sending (with attachment support for .ics files)
4. **Slice 4.4: Enrollment Event Publisher** - Update enrollment API to publish SNS events
5. **Slice 4.5: Meetup Signup Event Publisher** - Update meetup signup API to publish SNS events (NEW - integrates calendar invite sending)

Each slice will have detailed specifications in `specs/post_enrollment_email/slices/`.
