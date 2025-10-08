# LearnerMax Architecture (Compact)

```
                                                                                           ┌─────────────────────────────────────────────┐
                                                                                           │         AWS COGNITO USER POOL               │
                                                                                           │                                             │
┌──────────────┐          ┌────────────────────────────────────────────────┐            │  • Email/Password Auth                      │
│              │          │         FRONTEND (Vercel)                       │            │  • Google OAuth Federation                  │
│   Browser    │◄────────►│                                                 │            │  • User Attributes: sub, email, name        │
│              │  HTTPS   │  ┌──────────────────────────────────────────┐  │            │  • Tokens: access, id, refresh              │
│   Client     │          │  │      Next.js 15 App                      │  │            │                                             │
│              │          │  │  • TypeScript + React + Tailwind         │  │            └────────┬───────────────────┬────────────────┘
└──────────────┘          │  │  • Pages: /signin /dashboard /enroll     │  │                     │                   │
                          │  │                                          │  │                     │                   │
                          │  │  ┌────────────────────────────────────┐ │  │        PostConfirm  │                   │  JWT
                          │  │  │   NextAuth.js Middleware           │ │  │        Trigger      │                   │  Validation
                          │  │  │   • JWT Session (httpOnly cookie)  │ │  │                     │                   │
                          │  │  │   • Route Protection               │ │  │                     ▼                   │
                          │  │  │   • OAuth + Credentials Providers  │ │  │    ┌────────────────────────────┐      │
                          │  │  └────────────────────────────────────┘ │  │    │  PostConfirmation Lambda   │      │
                          │  │                                          │  │    │  • Extract user details    │      │
                          │  └──────────────┬──────────────────────────┘  │    │  • Publish to SNS          │      │
                          │                 │                              │    └──────────┬─────────────────┘      │
                          │                 │ API Calls                    │               │                        │
                          └─────────────────┼──────────────────────────────┘               │ SNS Message            │
                                            │ Authorization:                                │                        │
                                            │ Bearer <id_token>                             ▼                        │
                                            │                              ┌─────────────────────────────────┐      │
                                            │                              │  SNS: Student Onboarding Topic  │      │
                                            │                              └──────────┬──────────────────────┘      │
                                            │                                         │                             │
                                            │                                         ▼                             │
                                            │                              ┌─────────────────────────────────┐      │
                                            │                              │  Student Onboarding Lambda      │      │
                                            │                              │  • Create student in DynamoDB   │      │
                                            │                              │  • Conditional write (no dups)  │      │
                                            │                              └──────────┬──────────────────────┘      │
                                            │                                         │                             │
                                            │                                         │ Write                       │
                                            ▼                                         ▼                             │
               ┌────────────────────────────────────────────────┐      ┌──────────────────────────────────┐      │
               │      API GATEWAY (REST API)                    │      │     DynamoDB: Students Table     │      │
               │                                                │      │  PK: userId                      │      │
               │  ┌──────────────────────────────────────────┐ │      │  GSI: email-index                │      │
               │  │   Cognito Authorizer (Native AWS)        │ │      │  Attributes:                     │      │
               │  │   • Validates JWT from Authorization     │◄┼──────┤  • userId, email, name           │      │
               │  │   • Checks signature, expiry, claims     │ │      │  • enrolledCourses[]             │      │
               │  │   • Injects claims to requestContext     │ │      │  • createdAt, updatedAt          │      │
               │  └──────────────┬───────────────────────────┘ │      │  • signUpMethod                  │      │
               │                 │                              │      │                                  │      │
               │                 │ On Success                   │      │  DynamoDB Streams: Enabled       │      │
               └─────────────────┼──────────────────────────────┘      │  (NEW_AND_OLD_IMAGES)            │      │
                                 │                                     └──────────────────────────────────┘      │
                                 ▼                                                                                │
               ┌────────────────────────────────────────────────┐                                                 │
               │  Lambda Web Adapter Layer                      │      ┌──────────────────────────────────┐      │
               │  • Translates API Gateway → HTTP               │      │     DynamoDB: Courses Table      │      │
               │  • Enables Express.js in Lambda                │      │  PK: courseId                    │      │
               └────────────────┬───────────────────────────────┘      │  (Not yet fully implemented)     │      │
                                │                                      └──────────────────────────────────┘      │
                                ▼                                                                                 │
               ┌────────────────────────────────────────────────┐      ┌──────────────────────────────────┐      │
               │  Express.js API (Node.js 22.x Lambda)          │      │  Dead Letter Queue (SQS)         │      │
               │                                                │      │  learnermax-student-onboard-dlq  │      │
               │  Routes:                                       │      │  • Failed SNS messages           │      │
               │  • GET  /hello              (public)           │      │  • 14 day retention              │      │
               │  • POST /api/students       (no auth)          │──────►│  • Manual replay capability      │      │
               │  • GET  /api/students/:id   (protected)        │      └──────────────────────────────────┘      │
               │  • PATCH /api/students/:id  (protected)        │                                                 │
               │                                                │                                                 │
               │  Auth: Reads sub from requestContext claims    │                                                 │
               │  Validation: Zod schemas                       │                                                 │
               └────────────────────────────────────────────────┘                                                 │
                                                                                                                   │
                                                          ┌────────────────────────────────────────────────────────┘
                                                          │
                                                          │ All API requests authenticated via
                                                          │ API Gateway Cognito Authorizer
                                                          │ (validates JWT before reaching Lambda)
                                                          └────────────────────────────────────────────────────────►


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KEY FLOWS:

1. User Sign-Up (Google OAuth):
   Browser → NextAuth → Cognito Hosted UI → Google → Cognito User Pool → PostConfirmation Lambda → SNS → Student Onboarding Lambda → DynamoDB

2. User Sign-Up (Email/Password):
   Browser → Frontend (Cognito SDK) → Cognito User Pool → Email Verification → PostConfirmation Lambda → SNS → Student Onboarding Lambda → DynamoDB

3. Authenticated API Request:
   Browser → API Gateway (Cognito Authorizer validates JWT) → Lambda Web Adapter → Express.js → DynamoDB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TWO AUTH SCHEMES:

Frontend Protection:        NextAuth.js Middleware → JWT Session Cookie → Route Protection
Backend Protection:         API Gateway Cognito Authorizer → Native JWT Validation → Claims Injection

Event-Driven Architecture:  Cognito → SNS (Pub/Sub) → Lambda Consumers → DynamoDB → DynamoDB Streams (Future)
```
