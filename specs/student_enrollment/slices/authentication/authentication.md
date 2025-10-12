# Feature - Authentication & Student Onboarding

## Background
This is a focused specification for implementing the complete authentication system and student onboarding pipeline as part of the larger course application. This slice focuses on the backend infrastructure, authentication flows, event-driven architecture, and student data persistence—building on top of the UI-only landing and enrollment pages.

## User Story
As a student who has decided to enroll, I want to sign up using either my email/password or my Google account so that I can access the course content. When I sign up, the system should automatically create my student profile in the database so that my enrollment and progress can be tracked. I expect the sign-up process to be secure, reliable, and seamless regardless of which authentication method I choose.

## System
The system at the end of this slice should provide:
- **Complete authentication flows**: Sign up, sign in, password reset, forgot password, email verification
- **Social authentication**: Google OAuth via Cognito federation
- **Event-driven onboarding**: PostConfirmation Lambda → SNS → Student Onboarding Lambda → Student API → DynamoDB
- **Student API**: Express endpoints for creating and retrieving student records
- **Infrastructure as Code**: All resources defined in SAM template

## Tech Details

### Authentication Stack
- **AWS Cognito User Pool**: Primary authentication provider
  - Email/password authentication with verification
  - Google OAuth federation (Cognito as intermediary, not direct Google)
  - Password policies: min 8 chars, uppercase, lowercase, number, special char
  - Email verification required before access
  - Auto-verify email for Google sign-ups

- **Cognito User Pool Client**:
  - Allowed OAuth scopes: openid, email, profile
  - Callback URLs: Vercel preview and production URLs

- **Cognito Identity Provider**:
  - Google OAuth federation
  - Map Google attributes to Cognito user attributes
  - Lookup documentation for Cognito + Google federation setup

### Event-Driven Architecture
- **PostConfirmation Lambda**:
  - Triggered by Cognito after user confirms email/signs up
  - Extracts user details from Cognito event
  - Publishes SNS message to "StudentOnboarding" topic
  - Payload includes: userId (Cognito sub), email, name, signUpMethod (email/google), timestamp

- **SNS Topic (StudentOnboarding)**:
  - Fan-out pattern for multiple downstream systems
  - Currently one subscriber: Student Onboarding Lambda
  - Future subscribers: Email service, analytics, etc.

- **Student Onboarding Lambda**:
  - Subscribes to SNS StudentOnboarding topic
  - Parses SNS message
  - Calls Student API (POST /api/students) to create student record
  - Handles retries and error scenarios

### Student API (Express Backend)
Extend the existing Express app in `backend/` with student endpoints:

- **POST /api/students**
  - Protected by Cognito (requires valid JWT)
  - Request body: `{ userId, email, name, signUpMethod, enrolledCourses: [] }`
  - Creates student record in DynamoDB
  - Returns created student object with metadata (createdAt, updatedAt)

- **GET /api/students/:userId**
  - Protected by Cognito
  - Retrieves student by userId (Cognito sub)
  - Returns student object or 404

- **PATCH /api/students/:userId** (optional for this slice)
  - Protected by Cognito
  - Updates student profile (name, preferences, etc.)

### DynamoDB Schema

**Students Table**:
```
Table Name: learnermax-students-{env}
Primary Key: userId (String) - Cognito sub
Attributes:
  - userId: String (Cognito sub)
  - email: String
  - name: String
  - signUpMethod: String (email | google)
  - enrolledCourses: List<String> (courseIds)
  - createdAt: String (ISO timestamp)
  - updatedAt: String (ISO timestamp)
GSI: email-index (GSI1)
  - PK: email\
```

**Courses Table** (Read-only for this slice):
```
Table Name: learnermax-courses-{env}
Primary Key: courseId (String)
Attributes:
  - courseId: String
  - title: String
  - description: String
  - instructor: Map
  - duration: String
  - metadata: Map
Note: Write operations for this table will be done via local curl commands. Lets create a shell script for this.
```

### Infrastructure (SAM Template)
All resources in `backend/template.yaml`:

1. **Cognito User Pool** (`LearnerMaxUserPool`)
2. **Cognito User Pool Client** (`LearnerMaxUserPoolClient`)
3. **Cognito Identity Provider** (`LearnerMaxGoogleIdentityProvider`)
4. **PostConfirmation Lambda** (`PostConfirmationFunction`)
5. **SNS Topic** (`StudentOnboardingTopic`)
6. **Student Onboarding Lambda** (`StudentOnboardingFunction`)
7. **Students DynamoDB Table** (`StudentsTable`)
8. **Courses DynamoDB Table** (`CoursesTable`)
9. **API Gateway Integration** (extend existing API)
10. **IAM Roles & Permissions**

## Architecture Flow

### Sign-Up Flow (Email)
```
1. User fills form on /enroll page
2. Frontend calls Cognito API (AWS SDK) to sign up user
3. Cognito sends verification email
4. User clicks verification link
5. Cognito triggers PostConfirmation Lambda
6. PostConfirmation Lambda publishes to SNS
7. Student Onboarding Lambda receives SNS message
8. Student Onboarding Lambda calls POST /api/students
9. Express API writes to DynamoDB
10. User can now sign in
```

### Sign-Up Flow (Google OAuth)
```
1. User clicks "Sign in with Google" button on /enroll page
2. Frontend redirects to Cognito Hosted UI
3. Cognito redirects to Google OAuth
4. User authenticates with Google
5. Google redirects back to Cognito with OAuth token
6. Cognito creates user (auto-verified email)
7. Cognito triggers PostConfirmation Lambda
8. [Same as steps 6-9 above]
9. Cognito redirects back to frontend with authorization code
10. Frontend exchanges code for JWT tokens
11. User is authenticated
```

### Sign-In Flow (Returning User)
```
1. User visits /signin page
2. Enters email/password OR clicks Google button
3. Cognito authenticates user
4. Returns JWT access token, refresh token, ID token
5. Frontend stores tokens securely
6. Subsequent API calls include JWT in Authorization header
7. API Gateway validates JWT with Cognito
8. Express app receives verified user context
```

## Frontend Integration

### Next.js Pages
- **Update `/enroll` page**:
  - Connect form to actual Cognito sign-up API
  - Handle email verification flow
  - Google button redirects to Cognito Hosted UI

- **Create `/signin` page**:
  - Email/password login form
  - Google OAuth button
  - "Forgot password?" link
  - Redirect to `/course/<courseId>` after successful sign-in

- **Create `/forgot-password` page**:
  - Request password reset code
  - Enter code + new password

- **Create `/verify-email` page**:
  - Handle email verification flow
  - Display success message

### Authentication Library
- **NextAuth.js** with Cognito provider:
  - Configure NextAuth to use Cognito as OAuth provider
  - Cognito should be the only provider.  I.e. Cognito should delegate to Google, we shouldnt directly auth against google, just use cognito.

## URL Structure
- `/enroll?courseid=<courseId>` - Sign up page (existing, update to functional)
- `/signin` - Sign in page (new)
- `/forgot-password` - Password reset request (new)
- `/reset-password` - Password reset form (new)
- `/verify-email` - Email verification confirmation (new)

## API Endpoints

### Student API (Express)
- `POST /api/students` - Create student record
- `GET /api/students/:userId` - Get student by ID
- `PATCH /api/students/:userId` - Update student (optional)



### Data Validation
- Zod schemas for Student API request/response validation
- Email format validation
- Name length constraints

## Error Handling

### PostConfirmation Lambda Errors
- Logs error to CloudWatch
- SNS publish failures: Retry with exponential backoff
- Does not block Cognito sign-up flow (user is created even if SNS fails)

### Student Onboarding Lambda Errors
- SNS retries failed Lambda invocations automatically
- If API call fails: Dead Letter Queue (DLQ) for manual inspection
- Idempotency: Check if student already exists before creating

### API Errors
- 400 Bad Request: Invalid input
- 401 Unauthorized: Missing or invalid JWT
- 404 Not Found: Student not found
- 409 Conflict: Student already exists
- 500 Internal Server Error: Unexpected errors



## Deliverables

### Infrastructure (SAM Template)
- ✅ Cognito User Pool with email/password + Google federation
- ✅ PostConfirmation Lambda with SNS integration
- ✅ SNS Topic for student onboarding events
- ✅ Student Onboarding Lambda subscribed to SNS
- ✅ DynamoDB tables (Students, Courses)
- ✅ IAM roles and permissions
- ✅ API Gateway Cognito authorizer

### Backend (Express API)
- ✅ POST /api/students endpoint
- ✅ GET /api/students/:userId endpoint
- ✅ Cognito JWT validation middleware
- ✅ DynamoDB integration
- ✅ Error handling and logging
- ✅ Unit tests for Student API

### Lambda Functions
- ✅ PostConfirmation Lambda (TypeScript)
- ✅ Student Onboarding Lambda (TypeScript)
- ✅ Unit tests for both Lambdas

### Frontend (Next.js)
- ✅ Functional `/enroll` page with Cognito integration
- ✅ New `/signin` page
- ✅ New `/forgot-password` page
- ✅ New `/reset-password` page
- ✅ New `/verify-email` page
- ✅ NextAuth.js configuration with Cognito provider
- ✅ Protected route middleware
- ✅ E2E tests with provisioned user accounts.  One that never verified there email and one that has.  The one that did not should be asked to verify there email before being able to login..  Resend email if needed with code.


## Out of Scope (Future Slices)

### Not Included in This Slice
- ❌ Email sending system (SES + react-email templates)
- ❌ Course enrollment logic (separate from student creation)
- ❌ Course backend webpage (just student data for now)
- ❌ Multi-course selection UI
- ❌ Payment integration
- ❌ Student dashboard/profile page
- ❌ Course progress tracking



## Acceptance Criteria

### Must Have
1. User can sign up with email/password successfully
2. User receives email verification and can verify
3. User can sign up with Google OAuth successfully
4. PostConfirmation Lambda publishes to SNS correctly
5. Student Onboarding Lambda receives SNS messages
6. Student API creates student records in DynamoDB
7. User can sign in after sign-up
8. JWT tokens are issued correctly
9. Protected API endpoints validate JWT
10. All infrastructure deployed via SAM template

### Should Have
1. Password reset flow functional
2. Error messages are user-friendly
3. Loading states during auth operations
4. Idempotency in student creation (no duplicates)
5. CloudWatch logs for debugging


### Cognito + Google Federation Setup
1. Create Google OAuth credentials in Google Cloud Console. We will store in Secrets manager and expect you to use secret manager in sam template.
 {
         "ARN": "arn:aws:secretsmanager:us-east-1:<AWS_ACCOUNT_ID>:secret:learnermax/google-oauth-XXXXXX",
         "Name": "learnermax/google-oauth",
         "VersionId": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
     }
Keys: client_id and client_secret




