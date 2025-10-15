# Email Student After Enrollment

## Background
When a student completes signup via Cognito (email or social provider like Google), they should receive a welcome email confirming their enrollment and providing next steps to access the course.

## User Story
As a student who just signed up for the course, I want to receive an email that:
- Confirms my successful enrollment
- Welcomes me to the course
- Provides a direct link to login and access the course
- Sets clear expectations about what I can do next

## System Requirements

### Trigger
Email should be sent automatically after Cognito post-confirmation event. This happens when:
- User completes email verification (email signup flow)
- User completes social login (Google OAuth via Cognito)

### Email Content
- **Subject**: Welcome to [Course Name] - Let's Get Started
- **Body**:
  - Welcome message with student's name
  - Brief reminder of course value/outcomes
  - Clear CTA button to login and start first video
  - Support contact information
  - Professional, modern design matching landing page aesthetic

## Architecture Flow

```
Cognito Post Confirmation ’ Lambda (Post Confirmation Handler) ’ SNS Topic ’ Email Lambda ’ AWS SES
                                                                              “
                                                                    Student Data Lambda ’ DynamoDB
```

### Components

1. **Cognito Lambda Trigger** (Post Confirmation):
   - Triggered after user confirms email or completes social login
   - Publishes event to SNS topic with student data (email, name, courseId, timestamp)

2. **SNS Topic** (StudentEnrollmentEvents):
   - Pub/sub pattern allowing multiple subscribers
   - Decouples Cognito flow from downstream processes

3. **Email Lambda** (SendWelcomeEmail):
   - Subscribes to SNS topic
   - Renders email template using react-email
   - Sends via AWS SES
   - Handles failures with retry logic

4. **Student Data Lambda** (SaveStudentData):
   - Subscribes to same SNS topic
   - Saves student enrollment details to DynamoDB

## Tech Details

### AWS SES Setup
- Use SES in sandbox mode initially (production requires verification)
- Verify sender email domain
- Configure SES credentials in Lambda execution role

### Email Template
- Use **react-email** (https://github.com/resend/react-email)
- Create reusable email component in TypeScript
- Support dynamic data: student name, course name, login URL
- Render to HTML for SES compatibility

### Lambda Configuration
- Runtime: Node.js 18+ (TypeScript compiled)
- IAM Role needs: `ses:SendEmail`, `sns:Subscribe`, `logs:CreateLogGroup`
- Environment variables: `SES_FROM_EMAIL`, `COURSE_LOGIN_URL`, `SES_REGION`
- Timeout: 30 seconds (email sending can be slow)

### Infrastructure (AWS SAM/CloudFormation)
- Define SNS topic with email and student data Lambda subscriptions
- Configure Cognito user pool with Lambda trigger for post-confirmation
- Set up SES identity and permissions
- Create IAM roles with least privilege

## Acceptance Criteria
- [ ] Email arrives within 2 minutes of signup completion
- [ ] Email displays correctly in Gmail, Outlook, and mobile clients
- [ ] Login link in email redirects to `/course/<course-name>` after authentication
- [ ] Failed emails are logged with retry mechanism
- [ ] Email template is professional and matches landing page design
- [ ] Student data is saved to DynamoDB independently of email sending success

## Research Needed
- AWS SES best practices for transactional emails
- react-email template examples for welcome emails
- SNS retry policies and error handling patterns
- Cognito Lambda trigger payload structure

## Future Considerations
- Add unsubscribe link (required for marketing emails, optional for transactional)
- Support multiple course enrollment emails
- Email analytics (open rate, click-through tracking)
- Abandoned cart emails for paid courses
