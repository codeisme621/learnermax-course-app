# Feature - Post-Enrollment Email

## Background
Phase 1 built the platform, Phase 2 created the mini course, Phase 3 added premium course teaser. Now we need to send a welcome email when students enroll in a course. This improves the student experience by providing immediate confirmation, setting expectations, and giving them a clear path to start learning.

The email should be transactional (not marketing), sent immediately after enrollment, and provide the course link so students can start learning right away.

## User Story
As a student who just enrolled in a course, I want to receive a confirmation email that welcomes me, confirms my enrollment, and provides a direct link to access the course. This gives me confidence that my enrollment was successful and makes it easy to return to the course later without navigating through the platform.

## What We're Building
1. **SNS Topic & Subscription** - "Enrollment Completed" event topic with Lambda subscriber
2. **Email Template (React Email)** - HTML email template using @react-email/components
3. **Email Service** - AWS SES integration for sending emails
4. **Enrollment Event Publisher** - Publish to SNS after successful DynamoDB write
5. **Email Lambda Handler** - Subscribe to enrollment events and send emails

## What We're NOT Building
- No email campaign management (drip campaigns, sequences)
- No email preferences/unsubscribe (transactional only, legally required)
- No HTML email builder UI
- No email analytics (open rates, click tracking)
- No multi-language email support (English only for MVP)
- No premium course launch notification emails (future feature)

## Tech Details

### Architecture Flow
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
     "enrolledAt": "2025-01-15T10:30:00Z"
   }
   ```
5. Enrollment Email Lambda subscribed to SNS topic receives event
6. Lambda fetches student and course data from DynamoDB
7. Lambda renders React Email template with data
8. Lambda sends email via AWS SES
9. Student receives email within 1-2 minutes

**Event-driven architecture (similar to student onboarding):**
```
Enrollment API → DynamoDB Write → SNS Topic "EnrollmentCompleted"
                                         ↓
                                  Email Lambda (subscribed)
                                         ↓
                                    AWS SES → Email
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
- **EnrollmentCompleted Topic**: SNS topic for enrollment events
- **Transactional Email**: System-generated email triggered by user action (enrollment)
- **React Email**: React-based email template framework (@react-email/components)
- **Auto-Enrollment**: Automatic enrollment for free courses during student onboarding
- **Manual Enrollment**: User-initiated enrollment via "Enroll" button

## Data Requirements

### SNS Event Payload
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

### Email Template Data (fetched by Lambda)
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

### React Email Template Structure
Using `@react-email/components`:

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

### AWS SES Configuration
```typescript
{
  region: "us-east-1",
  from: "LearnerMax <noreply@learnermax.com>",
  replyTo: "support@learnermax.com",
  configurationSet: "learnermax-transactional", // For tracking bounces
  tags: [
    { Name: "EmailType", Value: "enrollment" },
    { Name: "Environment", Value: "production" }
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

1. **Slice 4.1: SNS Topic & Infrastructure** - Create EnrollmentCompleted topic and Lambda subscription
2. **Slice 4.2: React Email Template** - Build email template using @react-email/components
3. **Slice 4.3: Email Service & SES Integration** - Create email service with SES sending
4. **Slice 4.4: Enrollment Event Publisher** - Update enrollment API to publish SNS events
5. **Slice 4.5: Email Lambda Handler** - Lambda that subscribes to SNS and sends emails

Each slice will have detailed specifications in `specs/post_enrollment_email/slices/`.
