# Research: Authentication & Student Onboarding Implementation

**Date**: 2025-10-07
**Research Question**: Current state of authentication infrastructure and student onboarding implementation as specified in authentication.md

## Summary

The authentication and student onboarding system specified in `authentication.md` and `nextauth-cognito.md` is **not yet implemented**. The codebase currently contains:

- **Backend**: Minimal Express.js application with only a "Hello World" endpoint
- **Frontend**: UI-only landing and enrollment pages with placeholder authentication components
- **Infrastructure**: Basic SAM template with single Lambda function, no Cognito, SNS, or DynamoDB resources
- **Specifications**: Complete documentation for the authentication system architecture

All authentication infrastructure (Cognito, NextAuth, Lambda triggers, SNS topics, DynamoDB tables, and Student API) needs to be built according to the specifications.

## Detailed Findings

### 1. AWS Cognito & Authentication Infrastructure

**Current State**: NOT IMPLEMENTED

**Location**: Backend infrastructure defined in `backend/template.yaml:9-115`

The SAM template currently contains:
- `ExpressApiFunction` - Single Lambda function running Express.js
- `ApiGatewayApi` - API Gateway with API Key authentication only
- **Missing**: Cognito User Pool, Cognito User Pool Client, Google Identity Provider

**Dependencies Installed** (`backend/package.json:9-12`):
- `@aws-sdk/client-dynamodb`: ^3.398.0
- `@aws-sdk/lib-dynamodb`: ^3.398.0
- `express`: ^4.18.2
- **Missing**: `@aws-sdk/client-sns`, Cognito SDK, JWT validation libraries

**Environment Variables** (`backend/env.json:1-11`):
- Contains only placeholder DynamoDB table names
- **Missing**: Cognito User Pool ID, Client ID, Client Secret

**Specified Resources** (from `authentication.md:104-117`):
1. `LearnerMaxUserPool` - Cognito User Pool
2. `LearnerMaxUserPoolClient` - App client for OAuth flows
3. `LearnerMaxGoogleIdentityProvider` - Google OAuth federation
4. PostConfirmation Lambda function
5. SNS Topic for student onboarding
6. Student Onboarding Lambda
7. DynamoDB Students and Courses tables
8. API Gateway Cognito authorizer
9. IAM roles and permissions

### 2. Backend Express API Structure

**Current State**: MINIMAL IMPLEMENTATION

**Main Application** (`backend/src/app.ts:1-21`):
```typescript
import express, { Request, Response, Express } from 'express';

const app: Express = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.get('/hello', (req: Request, res: Response) => {
  console.info('GET /hello - Hello World endpoint');
  res.status(200).json({ message: 'hello world' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
```

**Current API Endpoints**:
- `GET /hello` - Hello World endpoint (only existing endpoint)

**Missing Student API Endpoints** (specified in `authentication.md:55-70`):
- `POST /api/students` - Create student record (protected by Cognito)
- `GET /api/students/:userId` - Get student by ID (protected by Cognito)
- `PATCH /api/students/:userId` - Update student (optional)

**Missing Components**:
- JWT validation middleware for Cognito tokens
- Student routes and handlers
- DynamoDB integration layer
- Error handling middleware
- Request validation (Zod schemas mentioned in spec)

**Project Structure**:
```
backend/
├── src/
│   ├── app.ts           - Main Express app (minimal)
│   └── run.sh           - Lambda execution script
├── events/              - Sample API Gateway events
├── scripts/             - Development scripts
├── template.yaml        - SAM infrastructure template
└── package.json         - Dependencies
```

### 3. Lambda Functions & Event-Driven Architecture

**Current State**: NOT IMPLEMENTED

**Specified Event Flow** (from `authentication.md:36-53`):

```
User Sign-up/Confirmation
  ↓
Cognito PostConfirmation Lambda
  ↓
SNS Topic (StudentOnboarding)
  ↓
Student Onboarding Lambda
  ↓
Student API (POST /api/students)
  ↓
DynamoDB Students Table
```

**Missing Lambda Functions**:

1. **PostConfirmation Lambda** (not implemented):
   - Trigger: Cognito PostConfirmation event
   - Action: Extract user details, publish to SNS
   - Payload: `{ userId, email, name, signUpMethod, timestamp }`
   - Error handling: Retry with exponential backoff, doesn't block Cognito flow

2. **Student Onboarding Lambda** (not implemented):
   - Trigger: SNS subscription to StudentOnboarding topic
   - Action: Parse SNS message, call Student API
   - Idempotency: Check if student already exists
   - Error handling: DLQ for failed processing

**Missing SNS Infrastructure**:
- No SNS topics defined in `template.yaml`
- No SNS subscriptions configured
- No fan-out pub/sub pattern implemented

### 4. NextAuth.js Configuration & Frontend Authentication

**Current State**: NOT IMPLEMENTED

**Existing Frontend Pages**:
- `/home/rico/projects/course-project-feature-varianta/frontend/app/enroll/page.tsx` - Enrollment page (UI-only, no auth logic)
- `/home/rico/projects/course-project-feature-varianta/frontend/app/page.tsx` - Landing page

**Existing Components**:
- `/home/rico/projects/course-project-feature-varianta/frontend/components/enrollment/EnrollmentForm.tsx` - Form component
- `/home/rico/projects/course-project-feature-varianta/frontend/components/enrollment/GoogleSignInButton.tsx` - Placeholder button (no OAuth)

**Missing NextAuth Configuration**:
- NextAuth API route: `app/api/auth/[...nextauth]/route.ts` (not created)
- Cognito provider configuration
- JWT session callbacks
- Token refresh logic

**Missing Authentication Pages** (specified in `authentication.md:169-182`):
- `/signin` - Sign-in page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/verify-email` - Email verification confirmation

**Missing Dependencies**:
- `next-auth` package not in `frontend/package.json`

**Missing Environment Variables** (from `nextauth-cognito.md:42-55`):
```
COGNITO_CLIENT_ID
COGNITO_CLIENT_SECRET
COGNITO_ISSUER_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
```

**Missing Middleware**:
- Protected route middleware (`middleware.ts`)
- Session provider wrapper
- Protected route components

**Specified NextAuth Configuration** (from `nextauth-cognito.md:65-101`):
- Cognito provider with JWT sessions
- JWT callback to store Cognito tokens (access, ID, refresh)
- Session callback to expose tokens to client
- Callback URL: `/api/auth/callback/cognito`

### 5. DynamoDB Table Schemas

**Current State**: NOT DEFINED IN INFRASTRUCTURE

**No DynamoDB tables exist** in `backend/template.yaml`

**Specified Students Table Schema** (from `authentication.md:74-88`):
```
Table Name: learnermax-students-{env}
Primary Key: userId (String) - Cognito sub
Attributes:
  - userId: String (Cognito sub)
  - email: String
  - name: String
  - signUpMethod: String (enum: "email" | "google")
  - enrolledCourses: List<String> (courseIds)
  - createdAt: String (ISO timestamp)
  - updatedAt: String (ISO timestamp)

Global Secondary Index (GSI):
  - email-index (GSI1)
    - Partition Key: email
```

**Access Patterns**:
1. Get student by userId (primary key lookup)
2. Get student by email (GSI query on email-index)
3. Create new student record
4. Update student profile
5. Add courses to enrolledCourses list

**Specified Courses Table Schema** (from `authentication.md:90-102`):
```
Table Name: learnermax-courses-{env}
Primary Key: courseId (String)
Attributes:
  - courseId: String
  - title: String
  - description: String
  - instructor: Map (nested object)
  - duration: String
  - metadata: Map

Note: Read-only for application
Write operations via local curl commands/shell scripts
```

**Frontend Course Model** (`frontend/lib/mock-data/course.ts:2-34`):
```typescript
interface CourseData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  level: string;
  category: string;
  instructor: {
    name: string;
    title: string;
    background: string;
    imageUrl: string;
  };
  outcomes: string[];
  curriculum: { module: string; topics: string[]; }[];
  testimonials: [...];
  stats: { students: string; rating: string; certificates: string; };
}
```

### 6. Authentication Flows

**Specified Email Sign-Up Flow** (from `authentication.md:120-132`):
1. User fills form on `/enroll` page
2. Frontend calls Cognito API (AWS SDK) to sign up user
3. Cognito sends verification email
4. User clicks verification link
5. Cognito triggers PostConfirmation Lambda
6. PostConfirmation Lambda publishes to SNS
7. Student Onboarding Lambda receives SNS message
8. Student Onboarding Lambda calls POST /api/students
9. Express API writes to DynamoDB
10. User can now sign in

**Specified Google OAuth Flow** (from `authentication.md:134-147`):
1. User clicks "Sign in with Google" on `/enroll`
2. Frontend redirects to Cognito Hosted UI
3. Cognito redirects to Google OAuth
4. User authenticates with Google
5. Google redirects to Cognito with OAuth token
6. Cognito creates user (auto-verified email)
7. Cognito triggers PostConfirmation Lambda
8. [Same SNS → Lambda → API → DynamoDB flow]
9. Cognito redirects to frontend with authorization code
10. Frontend exchanges code for JWT tokens
11. User is authenticated

**NextAuth Integration Pattern** (from `nextauth-cognito.md:122-146`):
- Call `signIn("cognito")` to redirect to Cognito Hosted UI
- Optional: `signIn("cognito", undefined, { identity_provider: "Google" })` to bypass Cognito login page
- Cognito redirects to Google, then back to `/api/auth/callback/cognito`
- NextAuth exchanges code for tokens and creates session

## Code References

### Backend
- `backend/template.yaml:9-115` - Current SAM template (missing Cognito, SNS, DynamoDB)
- `backend/src/app.ts:1-21` - Main Express application (minimal)
- `backend/package.json:9-12` - Current dependencies
- `backend/env.json:1-11` - Environment variables (placeholders only)

### Frontend
- `frontend/app/enroll/page.tsx` - Enrollment page (UI-only)
- `frontend/components/enrollment/EnrollmentForm.tsx` - Form component
- `frontend/components/enrollment/GoogleSignInButton.tsx` - Placeholder OAuth button
- `frontend/lib/mock-data/course.ts:2-34` - Course data interface

### Specifications
- `specs/student_enrollment/slices/authentication/authentication.md` - Complete authentication specification
- `specs/student_enrollment/slices/authentication/nextauth-cognito.md` - NextAuth + Cognito integration guide
- `specs/student_enrollment/mainspec.md:23-28` - Overall architecture diagram

## Architecture Documentation

### Current Architecture
```
Frontend (Next.js)
  ↓
API Gateway (API Key auth only)
  ↓
Express Lambda (single /hello endpoint)
```

### Specified Architecture
```
Frontend (Next.js + NextAuth)
  ↓
Cognito (Email/Password + Google OAuth)
  ↓
PostConfirmation Lambda
  ↓
SNS Topic (StudentOnboarding)
  ↓
Student Onboarding Lambda
  ↓
API Gateway (Cognito JWT Authorizer)
  ↓
Express Lambda (Student API)
  ↓
DynamoDB (Students, Courses tables)
```

### Event-Driven Patterns (Specified but Not Implemented)

1. **Cognito PostConfirmation Trigger**:
   - Event source: Cognito User Pool
   - Handler: Extract user data, publish to SNS
   - Error handling: Exponential backoff, doesn't block user creation

2. **SNS Fan-Out Pattern**:
   - Topic: StudentOnboarding
   - Current subscriber: Student Onboarding Lambda
   - Future subscribers: Email service, analytics

3. **Lambda-to-API Integration**:
   - Student Onboarding Lambda → HTTP call → Express Student API
   - Idempotency: Check if student exists before creating
   - Error handling: DLQ for failed messages

## Implementation Gaps

### Backend Infrastructure (SAM Template)
- [ ] Cognito User Pool with password policies
- [ ] Cognito User Pool Client with OAuth configuration
- [ ] Google Identity Provider for Cognito
- [ ] PostConfirmation Lambda function
- [ ] SNS Topic (StudentOnboarding)
- [ ] Student Onboarding Lambda with SNS subscription
- [ ] DynamoDB Students table with GSI
- [ ] DynamoDB Courses table
- [ ] API Gateway Cognito authorizer
- [ ] IAM roles and permissions

### Backend Application Code
- [ ] JWT validation middleware
- [ ] Student API routes (POST, GET, PATCH /api/students)
- [ ] DynamoDB client/repository layer
- [ ] Student service business logic
- [ ] Error handling middleware
- [ ] Zod validation schemas
- [ ] PostConfirmation Lambda handler
- [ ] Student Onboarding Lambda handler

### Frontend
- [ ] NextAuth API route configuration
- [ ] Cognito provider setup
- [ ] JWT session callbacks
- [ ] Token refresh logic
- [ ] Sign-in page (/signin)
- [ ] Forgot password page (/forgot-password)
- [ ] Reset password page (/reset-password)
- [ ] Email verification page (/verify-email)
- [ ] Protected route middleware
- [ ] Session provider wrapper
- [ ] Functional enrollment page with Cognito integration

### Dependencies
**Backend**:
- [ ] `@aws-sdk/client-sns`
- [ ] `@aws-sdk/client-cognito-identity-provider`
- [ ] JWT validation library (e.g., `aws-jwt-verify`)
- [ ] `zod` for validation

**Frontend**:
- [ ] `next-auth`
- [ ] AWS Cognito JavaScript SDK (if needed)

### Environment Variables
**Backend**:
- [ ] Cognito User Pool ID
- [ ] Cognito Client ID
- [ ] Cognito Client Secret
- [ ] SNS Topic ARN
- [ ] DynamoDB table names

**Frontend**:
- [ ] `COGNITO_CLIENT_ID`
- [ ] `COGNITO_CLIENT_SECRET`
- [ ] `COGNITO_ISSUER_URL`
- [ ] `NEXTAUTH_URL`
- [ ] `NEXTAUTH_SECRET`

## Open Questions

1. **Google OAuth Credentials**: 
 We will store in Secrets manager and expect you to use secret manager in sam template.
 {
         "ARN": "arn:aws:secretsmanager:us-east-1:853219709625:secret:learnermax/google-oauth-15o5Q2",
         "Name": "learnermax/google-oauth",
         "VersionId": "59341a65-cb66-4549-b3af-973c1e80348c"
     }
Keys: client_id and client_secret

2. **Environment Naming**: What value should be used for `{env}` in table names (learnermax-students-{env})?
preview and prod.

3. **Course Data Population**: How will the Courses table be initially populated? Shell script mentioned (`authentication.md:101`) but not created.
Yes, with script you create

4. **Cognito Domain**: Should the project use a custom domain or AWS-provided domain prefix for Cognito Hosted UI?
lets use cognito hosted

5. **Token Refresh**: Should the implementation include automatic token refresh using the refresh token? (Mentioned in `nextauth-cognito.md:204-207`)
Yes, auto refresh is required.

6. **Email Service**: The SNS fan-out pattern mentions future email service - is SES configuration needed now or later?
Later. No email system yet.

7. **Testing Strategy**: The spec mentions E2E tests with provisioned user accounts (`authentication.md:262`) - should test accounts be created during deployment?
Reference specs/student_enrollment/slices/authentication/testing-strategy.md