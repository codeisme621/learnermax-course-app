# LearnerMax Architecture

## System Overview

LearnerMax is a full-stack serverless course application built on AWS and Vercel with a Next.js frontend and Express.js backend. The system features event-driven architecture with two distinct authentication protection schemes: NextAuth.js (OAuth) for the frontend and native AWS Cognito Authorizer for the backend API Gateway.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                     │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Browser/User                                 │   │
│  └────────────────────┬────────────────────────────────────────────────┘   │
│                       │                                                      │
└───────────────────────┼──────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Vercel)                                   │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                    Next.js 15 Application                               │ │
│  │                   (TypeScript, React, Tailwind)                         │ │
│  │                                                                          │ │
│  │  Pages:  /signin  /signup  /dashboard  /enroll  /verify-email          │ │
│  │                                                                          │ │
│  │  ┌───────────────────────────────────────────────────────────────┐    │ │
│  │  │              NextAuth.js Middleware                            │    │ │
│  │  │              (middleware.ts)                                   │    │ │
│  │  │  • Session-based JWT Authentication                            │    │ │
│  │  │  • Route Protection (matcher pattern)                          │    │ │
│  │  │  • Redirects to /signin for protected routes                   │    │ │
│  │  └───────────────────────────────────────────────────────────────┘    │ │
│  │                                                                          │ │
│  │  ┌───────────────────────────────────────────────────────────────┐    │ │
│  │  │          NextAuth.js Authentication Providers                  │    │ │
│  │  │          (/api/auth/[...nextauth]/route.ts)                    │    │ │
│  │  │                                                                 │    │ │
│  │  │  1. Cognito OAuth Provider (Google Federation)                 │    │ │
│  │  │     • Uses Cognito Hosted UI                                   │    │ │
│  │  │     • OAuth 2.0 Authorization Code Flow                        │    │ │
│  │  │     • identity_provider: 'Google'                              │    │ │
│  │  │     • Returns: access_token, id_token, refresh_token           │    │ │
│  │  │                                                                 │    │ │
│  │  │  2. Credentials Provider (Email/Password)                      │    │ │
│  │  │     • Direct Cognito SDK calls (InitiateAuth)                  │    │ │
│  │  │     • USER_PASSWORD_AUTH flow                                  │    │ │
│  │  │     • Validates against Cognito User Pool                      │    │ │
│  │  │                                                                 │    │ │
│  │  │  Session Strategy: JWT (not database)                          │    │ │
│  │  │  Tokens stored in: NextAuth session (httpOnly cookie)          │    │ │
│  │  └───────────────────────────────────────────────────────────────┘    │ │
│  │                                                                          │ │
│  │  ┌───────────────────────────────────────────────────────────────┐    │ │
│  │  │           Cognito Client SDK (lib/cognito.ts)                  │    │ │
│  │  │  • SignUpCommand (email/password registration)                 │    │ │
│  │  │  • ConfirmSignUpCommand (email verification codes)             │    │ │
│  │  │  • ResendConfirmationCodeCommand                               │    │ │
│  │  │  • Direct client-side calls to Cognito (no backend)            │    │ │
│  │  └───────────────────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  Frontend makes API calls with Authorization header:                         │
│  Authorization: Bearer <id_token from NextAuth session>                      │
│                                                                               │
└────────────────────┬──────────────────────────────────────────────────────┬──┘
                     │                                                       │
                     │ HTTP Requests                                         │
                     │ (with Cognito ID Token)                               │
                     │                                                       │
                     ▼                                                       │
┌─────────────────────────────────────────────────────────────────────────┐ │
│                     AWS COGNITO LAYER                                     │ │
│                                                                           │ │
│  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │                   AWS Cognito User Pool                         │    │ │
│  │                   (learnermax-preview/prod)                     │    │ │
│  │                                                                  │    │ │
│  │  Identity Providers:                                            │    │ │
│  │  • COGNITO (Email/Password)                                     │    │ │
│  │  • Google OAuth (Federated Identity)                           │    │ │
│  │                                                                  │    │ │
│  │  User Attributes:                                               │    │ │
│  │  • email (required, verified)                                   │    │ │
│  │  • name (required)                                              │    │ │
│  │  • sub (userId - UUID)                                          │    │ │
│  │                                                                  │    │ │
│  │  OAuth Configuration:                                           │    │ │
│  │  • Callback URLs: Vercel preview/prod + localhost               │    │ │
│  │  • Flows: Authorization Code with PKCE                          │    │ │
│  │  • Scopes: openid, email, profile                              │    │ │
│  │                                                                  │    │ │
│  │  Token Configuration:                                           │    │ │
│  │  • Access Token: 1 hour                                         │    │ │
│  │  • ID Token: 1 hour                                             │    │ │
│  │  • Refresh Token: 30 days                                       │    │ │
│  └────────────────────────────────────────────────────────────────┘    │ │
│                             │                                            │ │
│                             │ PostConfirmation Trigger                   │ │
│                             ▼                                            │ │
│  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │        PostConfirmation Lambda Trigger                          │    │ │
│  │        (lambdas/post-confirmation.ts)                           │    │ │
│  │                                                                  │    │ │
│  │  Triggered by: User email verification OR OAuth sign-up         │    │ │
│  │                                                                  │    │ │
│  │  Actions:                                                        │    │ │
│  │  1. Extract user details (sub, email, name)                     │    │ │
│  │  2. Determine sign-up method (email vs google)                  │    │ │
│  │  3. Publish event to SNS topic                                  │    │ │
│  │                                                                  │    │ │
│  │  Event Payload:                                                  │    │ │
│  │  {                                                               │    │ │
│  │    userId: sub,                                                  │    │ │
│  │    email: string,                                                │    │ │
│  │    name: string,                                                 │    │ │
│  │    signUpMethod: 'email' | 'google',                            │    │ │
│  │    timestamp: ISO8601                                            │    │ │
│  │  }                                                               │    │ │
│  │                                                                  │    │ │
│  │  Error Handling: Non-blocking (logs but returns event)          │    │ │
│  └────────────────────────────────────────────────────────────────┘    │ │
│                             │                                            │ │
└─────────────────────────────┼────────────────────────────────────────────┘ │
                              │                                              │
                              ▼                                              │
┌─────────────────────────────────────────────────────────────────────────┐ │
│                      EVENT-DRIVEN LAYER (SNS/SQS)                        │ │
│                                                                           │ │
│  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │           SNS Topic: Student Onboarding                         │    │ │
│  │           (learnermax-student-onboarding-preview/prod)          │    │ │
│  │                                                                  │    │ │
│  │  Purpose: Decouple user sign-up from student record creation    │    │ │
│  │  Message Attributes: userId, signUpMethod                        │    │ │
│  └────────────────────────────────────────────────────────────────┘    │ │
│                             │                                            │ │
│                             ▼                                            │ │
│  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │      Student Onboarding Lambda Consumer                         │    │ │
│  │      (lambdas/student-onboarding.ts)                            │    │ │
│  │                                                                  │    │ │
│  │  Triggered by: SNS messages                                      │    │ │
│  │                                                                  │    │ │
│  │  Actions:                                                        │    │ │
│  │  1. Parse SNS message                                            │    │ │
│  │  2. Create student record in DynamoDB                            │    │ │
│  │  3. Use conditional write (prevent duplicates)                   │    │ │
│  │                                                                  │    │ │
│  │  DynamoDB Item:                                                  │    │ │
│  │  {                                                               │    │ │
│  │    userId: string (PK),                                          │    │ │
│  │    email: string (GSI),                                          │    │ │
│  │    name: string,                                                 │    │ │
│  │    signUpMethod: 'email' | 'google',                            │    │ │
│  │    enrolledCourses: [],                                          │    │ │
│  │    createdAt: ISO8601,                                           │    │ │
│  │    updatedAt: ISO8601                                            │    │ │
│  │  }                                                               │    │ │
│  │                                                                  │    │ │
│  │  Error Handling: Throws on failure → triggers retry             │    │ │
│  │  Duplicate Handling: Ignores ConditionalCheckFailed errors       │    │ │
│  │                                                                  │    │ │
│  │  Dead Letter Queue: learnermax-student-onboarding-dlq            │    │ │
│  │  • Captures failed messages after retries                        │    │ │
│  │  • Retention: 14 days                                            │    │ │
│  └────────────────────────────────────────────────────────────────┘    │ │
│                             │                                            │ │
└─────────────────────────────┼────────────────────────────────────────────┘ │
                              │                                              │
                              ▼                                              │
┌─────────────────────────────────────────────────────────────────────────┐ │
│                          BACKEND API (AWS)                                │ │
│                                                                           │ │
│  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │              API Gateway (REST API)                             │    │ │
│  │                                                                  │    │ │
│  │  Endpoint: /{proxy+}                                            │    │ │
│  │  Methods: GET, POST, PATCH, OPTIONS                             │    │ │
│  │                                                                  │    │ │
│  │  ┌────────────────────────────────────────────────────┐        │    │ │
│  │  │      Cognito Authorizer (Native AWS)               │        │    │ │
│  │  │                                                      │        │    │ │
│  │  │  Type: JWT Authorizer                               │        │    │ │
│  │  │  Token Source: Authorization header                 │        │    │ │
│  │  │  User Pool ARN: LearnerMaxUserPool                  │        │    │ │
│  │  │                                                      │        │    │ │
│  │  │  Validation:                                         │        │    │ │
│  │  │  1. Extracts JWT from Authorization header          │        │    │ │
│  │  │  2. Validates signature against Cognito JWKS        │        │    │ │
│  │  │  3. Checks token expiration                         │        │    │ │
│  │  │  4. Verifies aud/iss claims                         │        │    │ │
│  │  │                                                      │        │    │ │
│  │  │  On Success:                                         │        │    │ │
│  │  │  • Injects claims into requestContext.authorizer    │        │    │ │
│  │  │  • Available: sub, email, name, etc.                │        │    │ │
│  │  │                                                      │        │    │ │
│  │  │  On Failure: 401 Unauthorized                        │        │    │ │
│  │  └────────────────────────────────────────────────────┘        │    │ │
│  │                                                                  │    │ │
│  │  CORS Configuration:                                            │    │ │
│  │  • AllowOrigin: '*'                                             │    │ │
│  │  • AllowHeaders: 'Content-Type, Authorization'                  │    │ │
│  │  • AllowMethods: 'GET, POST, PATCH, OPTIONS'                    │    │ │
│  └────────────────────────────────────────────────────────────────┘    │ │
│                             │                                            │ │
│                             ▼                                            │ │
│  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │          Lambda Web Adapter Layer                               │    │ │
│  │          (arn:.../LambdaAdapterLayerX86:25)                     │    │ │
│  │                                                                  │    │ │
│  │  • Translates API Gateway events → HTTP requests                │    │ │
│  │  • Environment: AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap          │    │ │
│  │  • Listens on PORT=8080                                          │    │ │
│  │  • Enables standard Express.js in Lambda                         │    │ │
│  └────────────────────────────────────────────────────────────────┘    │ │
│                             │                                            │ │
│                             ▼                                            │ │
│  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │         Express.js API (ExpressApiFunction)                     │    │ │
│  │         (src/app.ts)                                            │    │ │
│  │                                                                  │    │ │
│  │  Runtime: Node.js 22.x                                          │    │ │
│  │  Handler: run.sh (starts Express server)                        │    │ │
│  │  Memory: 1024 MB                                                │    │ │
│  │  Timeout: 30 seconds                                            │    │ │
│  │                                                                  │    │ │
│  │  Routes:                                                         │    │ │
│  │  • GET  /hello                    → Health check                │    │ │
│  │  • POST /api/students              → Create student (no auth)   │    │ │
│  │  • GET  /api/students/:userId      → Get student (protected)    │    │ │
│  │  • PATCH /api/students/:userId     → Update student (protected) │    │ │
│  │                                                                  │    │ │
│  │  Authorization in Routes:                                        │    │ │
│  │  • Reads req.apiGateway.event.requestContext.authorizer.claims  │    │ │
│  │  • Extracts sub (userId) from Cognito claims                    │    │ │
│  │  • Validates user can only access own data                      │    │ │
│  │                                                                  │    │ │
│  │  Validation: Zod schemas for request bodies                     │    │ │
│  │  Error Handling: Standard HTTP status codes                     │    │ │
│  └────────────────────────────────────────────────────────────────┘    │ │
│                             │                                            │ │
└─────────────────────────────┼────────────────────────────────────────────┘ │
                              │                                              │
                              ▼                                              │
┌─────────────────────────────────────────────────────────────────────────┐ │
│                        DATA LAYER (DynamoDB)                              │ │
│                                                                           │ │
│  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │          Students Table                                         │    │ │
│  │          (learnermax-students-preview/prod)                     │    │ │
│  │                                                                  │    │ │
│  │  Partition Key: userId (string)                                 │    │ │
│  │                                                                  │    │ │
│  │  Global Secondary Index: email-index                            │    │ │
│  │  • Key: email                                                   │    │ │
│  │  • Projection: ALL                                              │    │ │
│  │                                                                  │    │ │
│  │  Attributes:                                                     │    │ │
│  │  • userId: string (PK, Cognito sub)                             │    │ │
│  │  • email: string (GSI)                                          │    │ │
│  │  • name: string                                                 │    │ │
│  │  • signUpMethod: 'email' | 'google'                             │    │ │
│  │  • enrolledCourses: string[]                                    │    │ │
│  │  • createdAt: string (ISO8601)                                  │    │ │
│  │  • updatedAt: string (ISO8601)                                  │    │ │
│  │                                                                  │    │ │
│  │  Billing: PAY_PER_REQUEST (on-demand)                           │    │ │
│  │                                                                  │    │ │
│  │  DynamoDB Streams:                                              │    │ │
│  │  • StreamViewType: NEW_AND_OLD_IMAGES                           │    │ │
│  │  • Use case: Future event triggers (audit, analytics, etc.)     │    │ │
│  └────────────────────────────────────────────────────────────────┘    │ │
│                                                                          │ │
│  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │          Courses Table                                          │    │ │
│  │          (learnermax-courses-preview/prod)                      │    │ │
│  │                                                                  │    │ │
│  │  Partition Key: courseId (string)                               │    │ │
│  │                                                                  │    │ │
│  │  Billing: PAY_PER_REQUEST                                       │    │ │
│  │                                                                  │    │ │
│  │  Note: Course management API not yet implemented                │    │ │
│  └────────────────────────────────────────────────────────────────┘    │ │
│                                                                          │ │
└──────────────────────────────────────────────────────────────────────────┘ │
                                                                             │
                                                                             │
┌─────────────────────────────────────────────────────────────────────────┐ │
│                      DEPLOYMENT & MONITORING                              │ │
│                                                                           │ │
│  Frontend (Vercel):                                                       │ │
│  • Environment: preview / prod                                            │ │
│  • Deploy: ./scripts/deploy-preview-frontend.sh                           │ │
│  • Logs: ./scripts/start-vercel-logs.sh → .vercel-logs.log               │ │
│                                                                           │ │
│  Backend (AWS SAM):                                                       │ │
│  • Environment: preview / prod                                            │ │
│  • Deploy: ./scripts/deploy-preview-backend.sh                            │ │
│  • Logs: ./scripts/start-sam-logs.sh → .sam-logs.log                     │ │
│  • Template: backend/template.yaml (CloudFormation/SAM)                   │ │
│                                                                           │ │
│  Monitoring:                                                              │ │
│  • AWS CloudWatch (Lambda logs, API Gateway metrics)                      │ │
│  • AWS X-Ray (Distributed tracing)                                        │ │
│  • Application Insights (Auto-configured)                                 │ │
│                                                                           │ │
└───────────────────────────────────────────────────────────────────────────┘ │
                                                                              │
                                                                              │
────────────────────────────────────────────────────────────────────────────────
```

## Authentication Architecture: Two Protection Schemes

### 1. Frontend Authentication (NextAuth.js)

**Type**: Session-based OAuth 2.0 + Credentials provider

**How it works**:
- **NextAuth.js middleware** (`middleware.ts`) protects routes using session checks
- Session stored as **JWT in httpOnly cookie** (not in database)
- Two authentication flows:
  1. **OAuth Flow** (Google via Cognito Hosted UI):
     - User clicks "Sign in with Google"
     - Redirected to Cognito Hosted UI → Google OAuth consent
     - Cognito exchanges Google token for Cognito tokens
     - Callback returns to `/api/auth/callback/cognito` with authorization code
     - NextAuth exchanges code for tokens (access, id, refresh)
     - Tokens stored in NextAuth session

  2. **Credentials Flow** (Email/Password):
     - Form submission to NextAuth credentials provider
     - Direct Cognito SDK call: `InitiateAuth` with USER_PASSWORD_AUTH
     - Returns tokens directly from Cognito
     - Tokens stored in NextAuth session

**Protection mechanism**:
- `middleware.ts` checks if session exists for protected routes (e.g., `/dashboard`)
- If no session → redirect to `/signin`
- Session contains: `user { id, email, name }`, `accessToken`, `idToken`

**Key files**:
- `frontend/lib/auth.ts` - NextAuth configuration
- `frontend/auth.config.ts` - Authorization callbacks
- `frontend/middleware.ts` - Route protection

### 2. Backend Authentication (API Gateway Cognito Authorizer)

**Type**: Native AWS Cognito JWT validation

**How it works**:
- API Gateway has a **Cognito Authorizer** configured at infrastructure level
- All API requests must include: `Authorization: Bearer <id_token>`
- API Gateway:
  1. Extracts JWT from Authorization header
  2. Validates signature against Cognito's JWKS (JSON Web Key Set)
  3. Checks token expiration, audience (aud), issuer (iss)
  4. **On success**: Injects claims into `requestContext.authorizer.claims`
  5. **On failure**: Returns 401 Unauthorized immediately (request never reaches Lambda)

**Authorization in Express API**:
- Lambda Web Adapter passes API Gateway context to Express
- Express routes read `req.apiGateway.event.requestContext.authorizer.claims.sub`
- Routes validate that authenticated user can only access their own resources
- Example: `GET /api/students/:userId` checks `authenticatedUserId === userId`

**Key difference from frontend**:
- No session management needed in backend
- Stateless JWT validation at API Gateway layer
- Express just reads pre-validated claims from request context

**Key files**:
- `backend/template.yaml` (lines 304-310) - Authorizer config
- `backend/src/routes/students.ts` (lines 24-28, 60-66) - Claims extraction

## Event-Driven Architecture

### Event Flow: User Sign-up → Student Record Creation

```
User Signs Up
     │
     ▼
Cognito User Pool
     │ (PostConfirmation Trigger)
     ▼
PostConfirmation Lambda
     │ (Publishes SNS message)
     ▼
SNS Topic: Student Onboarding
     │ (Fan-out pattern)
     ▼
Student Onboarding Lambda
     │ (Consumes messages)
     ▼
DynamoDB Students Table
     │
     ▼
(Optional) DynamoDB Streams → Future Lambda triggers
```

### Event Sources

1. **Cognito Events**:
   - `PostConfirmation` trigger → Fires after email verification or OAuth sign-up
   - Publishes to SNS for async processing

2. **SNS Events** (Pub/Sub):
   - `StudentOnboardingTopic` receives new user events
   - Decouples Cognito from database operations
   - Allows multiple subscribers (current: 1 Lambda, future: email service, analytics, etc.)

3. **DynamoDB Streams** (Change Data Capture):
   - Enabled on Students Table: `NEW_AND_OLD_IMAGES`
   - Not currently consumed, but ready for:
     - Audit logging
     - Search indexing (Elasticsearch/OpenSearch)
     - Real-time analytics
     - Replication to other systems

4. **API Events** (Implicit):
   - API Gateway triggers Express Lambda on HTTP requests
   - Express routes emit console logs → CloudWatch Logs

### Dead Letter Queue (DLQ)

- Queue: `learnermax-student-onboarding-dlq`
- Captures failed student onboarding messages after SNS retries
- Retention: 14 days
- Use case: Manual inspection and replay of failed onboardings

## Data Flow Examples

### Example 1: User Signs Up with Google

```
1. User clicks "Sign in with Google" → frontend/app/signin/page.tsx
2. NextAuth redirects to Cognito Hosted UI
3. Cognito Hosted UI redirects to Google OAuth consent
4. User approves → Google returns code to Cognito
5. Cognito exchanges code for Google token
6. Cognito creates/updates user in User Pool
7. Cognito PostConfirmation trigger fires → lambdas/post-confirmation.ts
8. Lambda publishes to SNS: { userId, email, name, signUpMethod: 'google' }
9. SNS invokes Student Onboarding Lambda → lambdas/student-onboarding.ts
10. Lambda writes student record to DynamoDB
11. DynamoDB Stream emits INSERT event (available for future consumers)
12. Cognito returns tokens to NextAuth callback
13. NextAuth creates session cookie
14. User redirected to /dashboard (protected route)
```

### Example 2: Authenticated API Request

```
1. Frontend gets user session with idToken from NextAuth
2. Frontend makes request: GET /api/students/abc123
   Headers: { Authorization: "Bearer <id_token>" }
3. Request hits API Gateway
4. API Gateway Cognito Authorizer:
   - Extracts JWT from Authorization header
   - Validates signature, expiration, claims
   - Injects claims into requestContext.authorizer
5. Lambda Web Adapter receives API Gateway event
6. Translates to HTTP request for Express
7. Express route: GET /api/students/:userId
   - Reads sub from requestContext.authorizer.claims
   - Validates sub === userId (authorization check)
   - Queries DynamoDB Students Table
8. Returns student JSON to frontend
```

### Example 3: Student Onboarding Failure with Retry

```
1. PostConfirmation Lambda publishes to SNS
2. SNS invokes Student Onboarding Lambda
3. Lambda fails to write to DynamoDB (e.g., network error)
4. Lambda throws error
5. SNS retries Lambda invocation (automatic, up to 3 times)
6. All retries fail
7. SNS sends message to Dead Letter Queue (DLQ)
8. DevOps team inspects DLQ
9. Team fixes issue and manually replays message
```

## Technology Stack

### Frontend (Vercel)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS, shadcn/ui
- **Auth**: NextAuth.js v5
- **API Client**: Cognito Identity Provider SDK (`@aws-sdk/client-cognito-identity-provider`)
- **Testing**: Jest, React Testing Library
- **Package Manager**: pnpm 10.13.1

### Backend (AWS)
- **API**: Express.js 4.18
- **Runtime**: Node.js 22.x (Lambda)
- **Language**: TypeScript (compiled to ES modules)
- **Lambda Adapter**: Lambda Web Adapter Layer (enables Express on Lambda)
- **Database**: DynamoDB (Students, Courses tables)
- **Messaging**: SNS (pub/sub), SQS (DLQ)
- **Auth**: AWS Cognito User Pool with Google Identity Provider
- **IaC**: AWS SAM (Serverless Application Model)
- **API Gateway**: REST API with Cognito Authorizer
- **Validation**: Zod schemas
- **Testing**: Jest with aws-sdk-client-mock
- **Monitoring**: CloudWatch Logs, X-Ray, Application Insights

### E2E Testing
- **Framework**: Playwright
- **Target**: Full user flows (frontend → backend → database)

### Deployment
- **Frontend**: Vercel CLI (preview/prod environments)
- **Backend**: AWS SAM CLI (`sam build && sam deploy`)
- **Scripts**: Shell scripts in `scripts/` directory with log monitoring

## Key Design Decisions

### 1. Why Two Different Auth Protection Schemes?

**Frontend (NextAuth.js)**:
- Need to support multiple OAuth providers easily (Google, GitHub, etc.)
- Session management with JWT cookies (no backend session store)
- Client-side and server-side session access in Next.js
- Built-in CSRF protection and callback URL validation
- NextAuth handles token refresh automatically

**Backend (API Gateway Authorizer)**:
- Native AWS integration = lowest latency (no custom Lambda authorizer)
- Stateless validation (no database lookups)
- API Gateway caches authorization decisions (reduces Cognito calls)
- Express Lambda doesn't need auth logic - claims already validated
- Scales automatically with API Gateway

**Why not use same approach for both?**
- Using NextAuth for backend would require custom Lambda authorizer (slower, more complex)
- Using raw Cognito SDK for frontend would lose NextAuth's OAuth abstraction
- Current setup leverages strengths of each platform

### 2. Why Event-Driven Architecture?

**Decoupling**:
- User sign-up (authentication) is separate concern from student record creation (application logic)
- PostConfirmation Lambda doesn't need DynamoDB permissions
- Student Onboarding Lambda can be deployed/updated independently

**Resilience**:
- SNS retries ensure student records are eventually created
- Dead Letter Queue captures failures for investigation
- User sign-up never fails due to database issues

**Extensibility**:
- Easy to add new subscribers: email service, analytics, webhook notifier
- DynamoDB Streams ready for future event consumers
- No code changes needed in Cognito or upstream components

### 3. Why Lambda Web Adapter for Express?

**Developer Experience**:
- Write standard Express.js code (no Lambda-specific handlers)
- Local development: `pnpm run dev` runs Express on port 8080
- Testing: Supertest works with Express app directly

**Portability**:
- Same Express code can run on Lambda, ECS, EC2, or locally
- Not locked into Lambda-specific patterns
- Easy to migrate to containers if needed

**Cost**:
- Lambda scales to zero (no idle costs)
- Pay only for request processing time
- 1 GB memory, 30s timeout is sufficient for API

## Environment Variables

### Frontend (Vercel)
```bash
NEXT_PUBLIC_COGNITO_REGION=us-east-1
NEXT_PUBLIC_COGNITO_CLIENT_ID=<from SAM outputs>
COGNITO_ISSUER_URL=<from SAM outputs>
COGNITO_USER_POOL_DOMAIN=<from SAM outputs>
NEXTAUTH_URL=https://preview-main.learnermax.vercel.app
NEXTAUTH_SECRET=<random secret>
NEXT_PUBLIC_API_GATEWAY_URL=<from SAM outputs>
```

### Backend (Lambda)
```bash
# Injected by template.yaml
STUDENTS_TABLE_NAME=learnermax-students-preview
COURSES_TABLE_NAME=learnermax-courses-preview
COGNITO_USER_POOL_ID=<from CloudFormation>
COGNITO_CLIENT_ID=<from CloudFormation>
SNS_TOPIC_ARN=<from CloudFormation>
PORT=8080
AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap
```

## Security Considerations

### Authentication
- All API routes require valid Cognito JWT token
- API Gateway validates tokens before reaching Lambda (fail-fast)
- Frontend middleware protects routes at edge (Next.js middleware)
- Tokens expire after 1 hour (short-lived)
- Refresh tokens valid for 30 days (stored in NextAuth session)

### Authorization
- Users can only access/modify their own resources
- Express routes validate `authenticatedUserId === requestedUserId`
- DynamoDB queries scoped to authenticated user's partition key

### Secrets Management
- Google OAuth credentials stored in AWS Secrets Manager
- Backend environment variables injected at deploy time
- Frontend public variables prefixed with `NEXT_PUBLIC_`
- NextAuth secret random 32-byte string

### CORS
- API Gateway allows all origins (`*`) for development
- Production should restrict to Vercel domains
- Credentials not included in CORS requests

### Input Validation
- All API inputs validated with Zod schemas
- DynamoDB conditional writes prevent race conditions
- Email verification required for email/password sign-ups

## Scalability

### Frontend (Vercel)
- Edge network with global CDN
- Automatic scaling (serverless functions)
- ISR (Incremental Static Regeneration) for static pages

### Backend (AWS Lambda)
- Concurrent execution: up to 1000 (default account limit)
- Auto-scales with request volume
- Cold start mitigation: provisioned concurrency (not currently enabled)

### Database (DynamoDB)
- On-demand billing mode = automatic scaling
- GSI (email-index) scales independently
- No capacity planning required

### Messaging (SNS/SQS)
- SNS: unlimited throughput
- SQS DLQ: handles up to 3,000 messages/second (more than sufficient)

## Cost Estimation (Monthly)

**Assumptions**: 1,000 users/month, 10 API requests/user, 90% Google OAuth

### Frontend (Vercel)
- Free tier: 100 GB bandwidth, unlimited requests
- Estimated: $0 (under free tier)

### Backend (AWS)
- Lambda: 10,000 requests × 1 GB × 200ms = ~$0.20
- API Gateway: 10,000 requests = $0.04
- DynamoDB: 10,000 writes + 10,000 reads = ~$1.25
- Cognito: 1,000 MAUs = Free (under 50k MAU free tier)
- SNS: 1,000 messages = $0.0005
- Total: **~$1.50/month**

At 10,000 users/month: **~$15-20/month**

## Monitoring and Observability

### Logs
- Frontend: Vercel logs (realtime via scripts/start-vercel-logs.sh)
- Backend: CloudWatch Logs (realtime via scripts/start-sam-logs.sh)
- Lambda: JSON structured logging
- API Gateway: Access logs with request ID

### Metrics
- CloudWatch: Lambda duration, errors, throttles
- API Gateway: Request count, latency, 4xx/5xx
- DynamoDB: Read/write capacity, throttles
- SNS/SQS: Messages published, failed deliveries

### Tracing
- AWS X-Ray: Distributed traces across API Gateway → Lambda → DynamoDB
- Trace ID in CloudWatch logs for correlation

### Alarms (Not yet configured)
- Lambda error rate > 5%
- API Gateway 5xx > 1%
- DLQ message count > 0
- Lambda throttles > 0

## Future Enhancements

### Event-Driven
- [ ] Add email service Lambda (SNS subscriber)
- [ ] Add analytics Lambda (SNS subscriber)
- [ ] Consume DynamoDB Streams for audit logging
- [ ] Add EventBridge for cross-service events

### Authentication
- [ ] Add refresh token rotation in NextAuth
- [ ] Implement MFA (Cognito supports TOTP)
- [ ] Add social providers: GitHub, Facebook

### API
- [ ] Implement course management endpoints
- [ ] Add student enrollment logic
- [ ] Add course progress tracking
- [ ] Add GraphQL API (AppSync)

### Infrastructure
- [ ] Add CloudFormation alarms
- [ ] Configure API Gateway throttling
- [ ] Add Lambda provisioned concurrency for prod
- [ ] Implement blue/green deployments
- [ ] Add WAF rules for API Gateway

### Monitoring
- [ ] Set up CloudWatch dashboards
- [ ] Configure SNS alerts for errors
- [ ] Add distributed tracing to frontend (Sentry)
- [ ] Implement log aggregation (ELK or CloudWatch Insights)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Maintainer**: LearnerMax Team
