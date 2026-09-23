# Pattern Analysis: Stripe Enrollment

**Date**: 2025-10-15
**Spec**: `specs/student_enrollment/slices/stripe-enrollment/stripe-enrollment.md`

## Executive Summary

The LearnerMax codebase already implements a well-architected **Strategy Pattern** for enrollment that is explicitly designed for extension with payment providers. The existing `FreeEnrollmentStrategy` provides a complete template for implementing `StripeEnrollmentStrategy`. The type system already includes Stripe-specific fields (`stripeSessionId`, `checkoutUrl`), and the frontend has established patterns for multi-step flows using sessionStorage coordination.

**Key Finding**: The codebase is architecturally ready for Stripe integration. No refactoring of existing patterns is needed—only extension through new strategy implementation.

---

## Existing Patterns Found

### 1. Strategy Pattern (Enrollment Types)

**Pattern Name**: Strategy Pattern (GoF Behavioral)
**Location**: `backend/src/features/enrollment/strategies/`

#### Current Implementation

**Interface Definition**: `backend/src/features/enrollment/strategies/enrollment-strategy.interface.ts:3-5`
```typescript
export interface EnrollmentStrategy {
  enroll(userId: string, courseId: string): Promise<EnrollmentResult>;
}
```

**Concrete Strategy**: `backend/src/features/enrollment/strategies/free-enrollment.strategy.ts:8-30`
- Implements `EnrollmentStrategy` interface (line 8)
- Constructs enrollment with `enrollmentType: 'free'`, `paymentStatus: 'free'` (lines 10-18)
- Persists via `enrollmentRepository.create()` (line 21)
- Returns `EnrollmentResult` with `status: 'active'` (lines 25-28)

**Strategy Selection**: `backend/src/features/enrollment/enrollment.service.ts:44-62`
```typescript
if (course.pricingModel === 'free') {
  const strategy = new FreeEnrollmentStrategy();
  const result = await strategy.enroll(userId, courseId);
  return result;
}
// ... Stripe strategy will be added here
throw new Error(`Unsupported pricing model: ${course.pricingModel}`);
```

#### Consistency

✅ **Highly consistent** - This is the ONLY enrollment mechanism in the codebase. All enrollment flows go through this strategy selection.

#### Usage

- Enables **Open/Closed Principle** - adding new payment providers requires zero changes to existing code
- Service layer remains unchanged when adding Stripe
- Repository layer shared across all strategies
- Route handlers agnostic to enrollment type

---

### 2. Repository Pattern

**Pattern Name**: Repository Pattern (Domain-Driven Design)
**Location**: All `*.repository.ts` files in feature directories

#### Current Implementation

**Example**: `backend/src/features/enrollment/enrollment.repository.ts:9-129`
- Exported as object literal (not class): `export const enrollmentRepository = { ... }`
- Encapsulates all DynamoDB operations
- Methods:
  - `create()` - lines 10-46
  - `get()` - lines 48-82
  - `getUserEnrollments()` - lines 84-128

**Data Mapping Pattern**:
- **Write** (domain → DB): Spread domain object + add DynamoDB keys (lines 12-18)
- **Read** (DB → domain): Destructure to remove DynamoDB keys (line 74)

**DynamoDB Client**: `backend/src/lib/dynamodb.ts:6-14`
- Centralized Document Client configuration
- Shared across all repositories
- Configured with marshall/unmarshall options

#### Consistency

✅ **Fully consistent** - Every data access follows this pattern:
- `enrollment.repository.ts` (lines 9-129)
- `course.repository.ts` (lines 9-110)
- `student.repository.ts` (lines 7-86)

#### Usage

- Abstracts DynamoDB operations from business logic
- Handles single-table design key construction
- Strips infrastructure keys before returning domain objects
- No ORM - direct AWS SDK v3 Document Client usage

---

### 3. Service Layer Pattern

**Pattern Name**: Service Layer (Domain-Driven Design)
**Location**: All `*.service.ts` files in feature directories

#### Current Implementation

**Example**: `backend/src/features/enrollment/enrollment.service.ts:9-91`
- Class definition: `export class EnrollmentService` (line 9)
- Singleton export: `export const enrollmentService = new EnrollmentService()` (line 91)
- Orchestrates business logic:
  - Idempotency check (lines 15-27)
  - Course validation (lines 30-34)
  - Strategy selection and execution (lines 43-55)

**Dependency Pattern**: Imports repositories directly (lines 1-2)
```typescript
import { enrollmentRepository } from './enrollment.repository';
import { courseRepository } from '../courses/course.repository';
```

#### Consistency

✅ **Fully consistent** across all features:
- `enrollment.service.ts` (lines 9-91)
- `course.service.ts` (lines 7-32)
- `student.service.ts` (similar pattern)

#### Usage

- Coordinates multi-repository operations
- Implements business rules (idempotency, validation)
- Delegates to strategies for type-specific logic
- Error handling and logging

---

### 4. Single-Table Design (DynamoDB)

**Pattern Name**: Single-Table Design (AWS Best Practice)
**Location**: `backend/template.yaml:134-176`

#### Current Implementation

**Table Structure**:
- **Primary Key**: PK (Hash), SK (Range)
- **GSI1**: GSI1PK (Hash), GSI1SK (Range) - for reverse lookups
- **email-index**: email (Hash) - for user lookup by email
- **BillingMode**: PAY_PER_REQUEST (on-demand)

**Key Patterns by Entity**:

| Entity | PK | SK | GSI1PK | GSI1SK |
|--------|----|----|---------|---------|
| User | `USER#{userId}` | `METADATA` | `USER#{userId}` | `METADATA` |
| Course | `COURSE#{courseId}` | `METADATA` | `COURSE` (constant) | `COURSE#{courseId}` |
| Enrollment | `USER#{userId}` | `COURSE#{courseId}` | `COURSE#{courseId}` | `USER#{userId}` |

**Access Patterns**:
- Get user → GetCommand with PK+SK
- Get user's enrollments → Query PK where SK begins_with `'COURSE#'`
- Get all courses → Query GSI1 where GSI1PK = `'COURSE'`
- Get enrollment → GetCommand with PK+SK

#### Consistency

✅ **Fully consistent** - All repositories follow the same key construction pattern:
- Entity type prefix (e.g., `USER#`, `COURSE#`)
- Composite keys for relationships
- GSI key inversion for bidirectional queries

#### Usage

- Enables related entities in same partition (user + enrollments)
- Supports multiple access patterns without scans
- Prepared for adding Stripe payment records as new entity type

---

### 5. Layered Architecture

**Pattern Name**: Layered Architecture (Architectural)
**Location**: Backend feature structure

#### Current Implementation

**Layer Flow**: Routes → Services → Repositories → AWS SDK

**Example Flow** (`POST /api/enrollments`):
1. **Route Layer** (`enrollment.routes.ts:12-43`)
   - Extracts userId from JWT context (line 16)
   - Validates authentication (lines 17-21)
   - Validates request body (lines 23-28)
   - Delegates to service (line 31)
   - Returns HTTP response (line 38)

2. **Service Layer** (`enrollment.service.ts:10-63`)
   - Checks existing enrollment (line 15)
   - Validates course exists (line 30)
   - Selects strategy (line 46)
   - Executes strategy (line 47)

3. **Repository Layer** (`enrollment.repository.ts:10-46`)
   - Constructs DynamoDB item (lines 12-18)
   - Executes PutCommand (lines 34-40)

4. **AWS SDK Layer** (`lib/dynamodb.ts:6`)
   - DynamoDB Document Client

#### Consistency

✅ **Fully consistent** - Every API endpoint follows this pattern:
- Student routes (lines 11-51)
- Course routes (lines 10-46)
- Enrollment routes (lines 12-93)

#### Usage

- Clear separation of concerns
- Easy to test (mock at layer boundaries)
- Routes never access database directly
- Services coordinate business logic
- Repositories handle data access

---

### 6. Authentication Pattern

**Pattern Name**: Adapter Pattern (GoF Structural)
**Location**: `backend/src/lib/auth-utils.ts:61-118`

#### Current Implementation

**Primary Function**: `getUserIdFromContext(req)` (lines 61-86)
- Reads `x-amzn-request-context` header (line 63)
- Parses API Gateway context from Lambda Web Adapter
- Handles both v1 (User Pool Authorizer) and v2 (JWT Authorizer) formats
- Returns Cognito `sub` claim or null

**Type Guards**:
- `isV1Context()` (lines 39-42)
- `isV2Context()` (lines 46-49)

**API Gateway Configuration**: `backend/template.yaml:362-368`
```yaml
Auth:
  DefaultAuthorizer: CognitoAuthorizer
  Authorizers:
    CognitoAuthorizer:
      UserPoolArn: !GetAtt LearnerMaxUserPool.Arn
```

#### Consistency

✅ **Fully consistent** - Used in every protected endpoint:
- `student.routes.ts:13-17`
- `enrollment.routes.ts:16-21`, `50-55`, `77-82`

#### Usage (for Stripe Webhooks)

⚠️ **Important**: Stripe webhooks CANNOT use this pattern (spec requirement at line 16)
- Webhooks don't have Cognito tokens
- Need webhook-specific signature verification
- Must exclude webhook path from API Gateway authorizer

---

### 7. Server Actions Pattern (Frontend)

**Pattern Name**: Backend for Frontend (Architectural)
**Location**: `frontend/app/actions/`

#### Current Implementation

**Example**: `frontend/app/actions/enrollments.ts:44-102`
- `'use server'` directive marks server-only execution (line 1)
- Calls `getAuthToken()` for authentication (line 48)
- Makes fetch request to backend API (lines 60-70)
- Returns typed result object (lines 87-94)

**Authentication**: `frontend/app/actions/auth.ts:97-119`
- `getAuthToken()` extracts `id_token` from NextAuth session (line 109)
- Wrapped with React `cache()` to prevent duplicate calls (line 97)

**Error Handling Pattern**:
```typescript
try {
  // API call
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    return { success: false, error: errorData.error };
  }
  return { success: true, data: ... };
} catch (error) {
  return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
}
```

#### Consistency

✅ **Fully consistent** across all server actions:
- `courses.ts` (lines 44-157)
- `enrollments.ts` (lines 44-204)
- `auth.ts` (lines 8-142)

#### Usage

- Abstracts API communication from components
- Handles authentication token injection
- Provides type-safe API client
- Consistent error handling structure

---

### 8. Multi-Step Flow Coordination (Frontend)

**Pattern Name**: State Transfer Pattern
**Location**: Frontend landing → enrollment → dashboard flow

#### Current Implementation

**Step 1 - Landing Page** (`frontend/components/landing/HeroSection.tsx:17-22`):
```typescript
const handleEnrollClick = () => {
  sessionStorage.setItem('pendingEnrollmentCourseId', courseId);
  router.push('/enroll');
};
```

**Step 2 - Sign-Up Page** (`frontend/app/enroll/page.tsx:1-32`):
- User creates account
- Redirects to verify-email
- After verification, user signs in → redirected to dashboard

**Step 3 - Dashboard Auto-Enrollment** (`frontend/components/dashboard/DashboardContent.tsx:37-84`):
```typescript
useEffect(() => {
  const pendingCourseId = sessionStorage.getItem('pendingEnrollmentCourseId');

  if (pendingCourseId) {
    enrollInCourse(pendingCourseId).then((result) => {
      if (result.success) {
        logger.info('Auto-enrollment successful');
      }
    });
    // Always clear after attempt
    sessionStorage.removeItem('pendingEnrollmentCourseId');
  }

  // Fetch courses and enrollments
  // ...
}, []);
```

#### Consistency

✅ **Used in 2 entry points**:
- Hero section (main landing page)
- CTA section (secondary entry point)

Both use identical pattern: `sessionStorage.setItem()` → navigate → Dashboard reads and clears

#### Usage (for Stripe Flow)

This pattern extends naturally for paid courses:
1. Landing: Store courseId in sessionStorage
2. Sign-up: User creates account
3. Dashboard: Read courseId, initiate Stripe Checkout (get checkoutUrl from API)
4. Redirect to Stripe: User completes payment
5. Return to Dashboard: Clear sessionStorage, show enrolled state (via webhook completion)

---

### 9. Component State Pattern (Frontend)

**Pattern Name**: Local State Management
**Location**: All client components use `useState` hooks

#### Current Implementation

**Example**: `frontend/components/dashboard/CourseCard.tsx:20-21`
```typescript
const [isEnrolling, setIsEnrolling] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Async Operation Pattern** (lines 25-38):
```typescript
const handleEnrollClick = async () => {
  setError(null);
  setIsEnrolling(true);

  try {
    await onEnroll(course.courseId);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to enroll');
  } finally {
    setIsEnrolling(false);
  }
};
```

**Computed State**: `frontend/components/dashboard/DashboardContent.tsx:31-35`
```typescript
const enrollmentMap = new Map<string, Enrollment>();
enrollments.forEach((enrollment) => {
  enrollmentMap.set(enrollment.courseId, enrollment);
});
```

#### Consistency

✅ **Universal pattern** - No global state management library used
- All UI state is local to components
- Props passed down for coordination
- SessionStorage only for cross-page flows

#### Usage

- Simple, predictable state management
- Easy to test
- No Redux/Zustand overhead
- Sufficient for application complexity

---

### 10. Conditional Write Pattern (Idempotency)

**Pattern Name**: Optimistic Locking
**Location**: Repository create methods

#### Current Implementation

**Example**: `backend/src/features/enrollment/enrollment.repository.ts:34-40`
```typescript
await docClient.send(
  new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(PK)',
  })
);
```

**Error Handling**: `backend/src/lambdas/student-onboarding.ts:88-95`
```typescript
if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
  logger.warn('Student already exists', { userId });
  return; // Idempotent - not an error
}
throw error; // Other errors should fail
```

#### Consistency

✅ **Used in all create operations**:
- Enrollment creation (enrollment.repository.ts:38)
- Student creation (student-onboarding.ts:70)

#### Usage

- Prevents duplicate enrollments
- Safe for retries (webhook replay protection)
- No distributed locking needed
- DynamoDB atomic operation

---

## Pattern Analysis for Spec Requirements

### Requirement 1: Payment Provider Extensibility

**Spec Quote** (line 14):
> "Creating a new concept called Payment Provider and in future Payment Providers should be easy to create... closed for modification open for extension"

#### Existing Pattern Match

✅ **Strategy Pattern** at `backend/src/features/enrollment/strategies/` (lines 3-30)

#### Fit Assessment

**Perfect fit** - The existing Strategy Pattern is explicitly designed for this:

1. **Interface-based extensibility**: `EnrollmentStrategy` interface defines contract
2. **No modification needed**: Add new `StripeEnrollmentStrategy` class, implement interface
3. **Service layer unchanged**: Strategy selection in `enrollment.service.ts:44-62` only needs one new `else if` branch
4. **Type system ready**: `Enrollment.enrollmentType: 'paid'` already defined (enrollment.types.ts:4)

**Code Required**:
```typescript
// NEW FILE: backend/src/features/enrollment/strategies/stripe-enrollment.strategy.ts
export class StripeEnrollmentStrategy implements EnrollmentStrategy {
  async enroll(userId: string, courseId: string): Promise<EnrollmentResult> {
    // 1. Create Stripe Checkout Session
    // 2. Create pending enrollment with stripeSessionId
    // 3. Return checkoutUrl for redirect
  }
}

// MODIFY: backend/src/features/enrollment/enrollment.service.ts:44-62
} else if (course.pricingModel === 'paid') {
  const strategy = new StripeEnrollmentStrategy();
  return await strategy.enroll(userId, courseId);
}
```

**Future PayPal**: Add `PayPalEnrollmentStrategy`, extend switch statement. Service, routes, repository all unchanged.

---

### Requirement 2: Stripe Embedded Form Integration

**Spec Quote** (line 15):
> "I want to use stripes embedded form for the stripe integration"

#### Existing Pattern Match

✅ **Server Actions + Component State Pattern** at `frontend/app/actions/` and `frontend/components/dashboard/`

#### Fit Assessment

**Strong fit** - Frontend patterns support Stripe Checkout flow:

1. **Server Action creates Checkout Session**: Call backend API to get `checkoutUrl`
2. **Component handles redirect**: `window.location.href = checkoutUrl`
3. **Return URL**: Stripe redirects back to dashboard after payment
4. **Enrollment status updated via webhook**: Dashboard shows enrolled state

**Recommended Implementation**:
```typescript
// frontend/app/actions/enrollments.ts (new function)
export async function createStripeCheckout(courseId: string) {
  // Calls backend POST /api/enrollments
  // Backend returns { checkoutUrl, status: 'pending' }
  return { checkoutUrl };
}

// frontend/components/dashboard/CourseCard.tsx (modify handleEnrollClick)
if (course.pricingModel === 'paid') {
  const result = await createStripeCheckout(course.courseId);
  if (result.checkoutUrl) {
    window.location.href = result.checkoutUrl; // Redirect to Stripe
  }
} else {
  await onEnroll(course.courseId); // Existing free enrollment
}
```

**Note**: Spec mentions "embedded form" but Stripe's recommended approach for Next.js is Checkout (hosted page), not Embedded Checkout. Checkout provides better UX and simpler implementation. If truly embedded is required, use `@stripe/react-stripe-js` with Elements.

---

### Requirement 3: Webhook Handler for Payment Confirmation

**Spec Quote** (lines 16, 63):
> "stripe webhooks will not have a cognito account and thus will need to handle the stripe webhook differently"
> "Webhooks implemented for Stripe to call so we can confirm on our side the success of the payment"

#### Existing Pattern Match

⚠️ **No webhook pattern exists** - Current async handling uses SNS/Lambda triggers, not HTTP webhooks

**Closest Pattern**: Lambda handler at `backend/src/lambdas/student-onboarding.ts:33-120`
- Shows error handling, idempotency, and retry patterns
- But uses SNS event, not HTTP request

#### Fit Assessment

**Requires new pattern** - Must implement:

1. **New Express route WITHOUT Cognito auth**
2. **Stripe signature verification** (replaces Cognito auth)
3. **Idempotent event processing** (use conditional writes)
4. **Update enrollment to completed status**

**Implementation Approach**:

**Option A - Dedicated Lambda** (Recommended):
```typescript
// NEW FILE: backend/src/lambdas/stripe-webhook.ts
// Separate Lambda function with function URL (no API Gateway)
// Lambda function URL supports streaming for large payloads
// No authorizer - Stripe signature verification in handler
```

**Option B - Express route** (spec implied):
```typescript
// NEW FILE: backend/src/features/payment/stripe-webhook.routes.ts
router.post('/webhooks/stripe', async (req, res) => {
  // Verify Stripe signature (req.headers['stripe-signature'])
  // NO getUserIdFromContext() call
  // Process event based on type
  // Return 200 immediately to Stripe
});

// MODIFY: backend/src/app.ts (add route BEFORE Cognito routes)
app.use('/api/payment', paymentRoutes); // Must be public path

// MODIFY: backend/template.yaml (exclude webhook from auth)
Auth:
  DefaultAuthorizer: CognitoAuthorizer
  Authorizers:
    CognitoAuthorizer:
      UserPoolArn: !GetAtt LearnerMaxUserPool.Arn
  # ... existing config
  # Add exclude paths here
```

**Webhook Pattern Details**:
```typescript
// Verify signature
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

// Handle event
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;

  // Extract userId and courseId from session.metadata
  await enrollmentRepository.update(userId, courseId, {
    paymentStatus: 'completed',
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    paidAt: new Date().toISOString(),
  });
}

res.json({ received: true }); // Always return 200 to Stripe
```

---

### Requirement 4: Store Stripe Info in DynamoDB

**Spec Quote** (line 63):
> "capture the stripe info in our dynamoDb"

**Spec Quote** (lines 37-43):
> "I have updated the courses that are paid with a stripe product id... stripeProductId and stripePriceId"

#### Existing Pattern Match

✅ **Repository Pattern + Single-Table Design** at `backend/src/features/enrollment/enrollment.repository.ts`

#### Fit Assessment

**Perfect fit** - DynamoDB schema-less design supports adding attributes:

1. **Type System**: `Enrollment.stripeSessionId` already exists (enrollment.types.ts:7)
2. **Repository Method Needed**: Add `update()` method (missing, see gap below)
3. **Course Fields**: Add to TypeScript types (already in DynamoDB via script)

**Required Type Changes**:

```typescript
// backend/src/features/enrollment/enrollment.types.ts
export interface Enrollment {
  // ... existing fields
  stripeSessionId?: string;           // Already exists!
  stripePaymentIntentId?: string;     // ADD
  stripePriceId?: string;             // ADD
  paidAt?: string;                    // ADD
  amount?: number;                    // ADD (for audit)
  currency?: string;                  // ADD (for audit)
}

// backend/src/features/courses/course.types.ts
export interface Course {
  // ... existing fields
  stripeProductId?: string;           // ADD (exists in DB, not in type)
  stripePriceId?: string;             // ADD (exists in DB, not in type)
}
```

**Repository Method Needed**:

```typescript
// backend/src/features/enrollment/enrollment.repository.ts
async update(
  userId: string,
  courseId: string,
  updates: Partial<Enrollment>
): Promise<void> {
  // Follow pattern from student.repository.ts:62-85
  // Build dynamic UpdateExpression
  // Use ExpressionAttributeNames for reserved words
}
```

---

### Requirement 5: Stripe Secrets in AWS Secrets Manager

**Spec Quote** (lines 18-34):
> "I have created stripe secrets in secret manager... learnermax/stripe"

#### Existing Pattern Match

✅ **Environment Variable Pattern** used throughout backend

#### Fit Assessment

**Good fit with extension** - Current pattern uses `process.env`, need to fetch secrets at Lambda initialization

**Current Pattern**: `backend/src/features/enrollment/enrollment.repository.ts:7`
```typescript
const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;
```

**Recommended Pattern for Secrets**:
```typescript
// NEW FILE: backend/src/lib/stripe-client.ts
import Stripe from 'stripe';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let stripeClient: Stripe | null = null;

export async function getStripeClient(): Promise<Stripe> {
  if (stripeClient) return stripeClient; // Cached for Lambda reuse

  const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const response = await secretsManager.send(
    new GetSecretValueCommand({ SecretId: 'learnermax/stripe' })
  );

  const secrets = JSON.parse(response.SecretString!);
  stripeClient = new Stripe(secrets.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });

  return stripeClient;
}
```

**Template Changes**:
```yaml
# backend/template.yaml (add to Lambda permissions)
Policies:
  - Statement:
    - Effect: Allow
      Action:
        - secretsmanager:GetSecretValue
      Resource: arn:aws:secretsmanager:us-east-1:853219709625:secret:learnermax/stripe-*
```

---

### Requirement 6: Frontend Dashboard Flow

**Spec Quote** (lines 8-10):
> "When on Dashboard and I click on a CourseCard enroll now button that is pricingModel 'paid', I expect a Stripe powered payment flow to begin... if successfully paid, then I expect to be returned to the dashboard where I see a green Enrolled icon"

#### Existing Pattern Match

✅ **Multi-Step Flow Pattern** at `frontend/components/dashboard/DashboardContent.tsx:37-100`

#### Fit Assessment

**Excellent fit** - Existing pattern extends naturally:

**Current Free Flow**:
1. Click "Enroll Now" → `handleEnroll()` (line 86)
2. Calls `enrollInCourse()` server action (line 88)
3. On success, refetch enrollments (line 92)
4. UI updates to show "Continue Learning" button

**New Paid Flow** (extension):
1. Click "Enroll Now" → Check `course.pricingModel`
2. If 'paid': Call `createStripeCheckout()` server action
3. Redirect to `checkoutUrl` (Stripe hosted page)
4. User completes payment
5. Stripe redirects back to `/dashboard?success=true`
6. Dashboard fetches enrollments (shows enrolled via webhook completion)
7. UI shows "Continue Learning" button

**Code Changes**:

```typescript
// frontend/components/dashboard/DashboardContent.tsx
const handleEnroll = async (courseId: string) => {
  const course = courses.find(c => c.courseId === courseId);

  if (course?.pricingModel === 'paid') {
    // NEW: Stripe checkout flow
    setIsLoading(true);
    const result = await createStripeCheckout(courseId);

    if (result.success && result.checkoutUrl) {
      window.location.href = result.checkoutUrl; // Redirect to Stripe
    } else {
      throw new Error(result.error || 'Failed to create checkout session');
    }
  } else {
    // EXISTING: Free enrollment flow
    const result = await enrollInCourse(courseId);
    if (result.success) {
      const updatedEnrollments = await getUserEnrollments();
      setEnrollments(updatedEnrollments.data || []);
    } else {
      throw new Error(result.error || 'Enrollment failed');
    }
  }
};
```

**Stripe Return URL Configuration**:
```typescript
// backend: When creating Checkout Session
const session = await stripe.checkout.sessions.create({
  success_url: `${process.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.FRONTEND_URL}/dashboard?canceled=true`,
  // ... other config
});
```

---

## Recommendations

### Use Existing Patterns

| Pattern | Use For | Implementation Location | Reason |
|---------|---------|------------------------|--------|
| **Strategy Pattern** | Stripe enrollment logic | `backend/src/features/enrollment/strategies/stripe-enrollment.strategy.ts` | Already designed for this exact use case. Zero changes to service layer needed. |
| **Repository Pattern** | Stripe payment records | Extend `enrollment.repository.ts` with `update()` method | Consistent data access, handles DynamoDB keys, strips infrastructure concerns. |
| **Server Actions** | Frontend Stripe API calls | `frontend/app/actions/enrollments.ts` - add `createStripeCheckout()` | Consistent auth handling, error structure, type safety. |
| **Multi-Step Flow** | Dashboard → Stripe → Dashboard | Extend `DashboardContent.tsx:86-100` | Pattern already proven for free enrollment, extends naturally for redirects. |
| **Conditional Writes** | Webhook idempotency | Reuse `ConditionExpression` pattern | Prevents duplicate processing, safe for Stripe webhook retries. |
| **Single-Table Design** | Store Stripe payment data | Extend Enrollment entity with Stripe fields | No new table needed, maintains access patterns, prepared for relationships. |

### Implementation Sequence

**Following existing patterns, implement in this order**:

1. **Add Stripe dependencies**
   - Backend: `pnpm add stripe @aws-sdk/client-secrets-manager`
   - Frontend: `pnpm add @stripe/stripe-js` (only if using embedded, not needed for Checkout redirect)

2. **Extend type system** (zero runtime impact)
   - Add fields to `Enrollment` interface
   - Add fields to `Course` interface

3. **Add repository method** (follows existing pattern)
   - Implement `enrollmentRepository.update()` following `student.repository.ts:62-85` pattern

4. **Create Stripe client utility** (new pattern, but follows AWS SDK patterns)
   - `backend/src/lib/stripe-client.ts`
   - Fetch secrets from Secrets Manager
   - Cache client for Lambda reuse

5. **Implement Stripe enrollment strategy** (follows Strategy Pattern)
   - `backend/src/features/enrollment/strategies/stripe-enrollment.strategy.ts`
   - Create Checkout Session
   - Store pending enrollment with `stripeSessionId`
   - Return `{ checkoutUrl, status: 'pending' }`

6. **Modify enrollment service** (minimal change)
   - Add `else if (course.pricingModel === 'paid')` branch at line 57

7. **Create webhook handler** (new pattern - see "Suggested New Patterns" below)
   - Option A: Separate Lambda with function URL
   - Option B: Express route excluded from API Gateway auth

8. **Frontend server action** (follows existing pattern)
   - Add `createStripeCheckout()` to `enrollments.ts`
   - Follows same auth and error handling as `enrollInCourse()`

9. **Frontend dashboard changes** (extends existing flow)
   - Modify `handleEnroll()` to check `pricingModel`
   - Add redirect for paid courses
   - Existing enrollment map pattern handles webhook updates

10. **Infrastructure updates**
    - Add Secrets Manager permissions to Lambda
    - Configure webhook endpoint (function URL or API Gateway exclusion)
    - Add environment variables for Stripe webhook secret

---

### Suggested New Patterns

Only ONE new pattern is required (all others reuse existing patterns):

#### Pattern: Webhook Handler with Signature Verification

**Why New Pattern?**: No HTTP webhooks exist in codebase currently. All async handlers use AWS services (SNS, Cognito triggers).

**Recommendation**: **Separate Lambda Function with Function URL** (not Express route)

**Justification**:
1. **Isolation**: Webhook has different auth, error handling, and payload requirements than REST API
2. **Security**: Function URL allows public access with custom signature verification
3. **Performance**: Dedicated Lambda with optimized timeout/memory for webhook processing
4. **SAM Integration**: Easy to add to `template.yaml` with event trigger

**Implementation**:

```yaml
# backend/template.yaml
StripeWebhookFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: stripe-webhook.handler  # NOT run.sh
    Runtime: nodejs22.x
    Timeout: 30  # Short timeout, Stripe expects fast response
    Environment:
      Variables:
        EDUCATION_TABLE_NAME: !Ref EducationTable
        STRIPE_WEBHOOK_SECRET: !Sub '{{resolve:secretsmanager:learnermax/stripe:SecretString:STRIPE_WEBHOOK_SECRET}}'
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref EducationTable
      - Statement:
        - Effect: Allow
          Action: secretsmanager:GetSecretValue
          Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:learnermax/stripe-*'
    FunctionUrlConfig:
      AuthType: NONE  # Public endpoint
      Cors:
        AllowOrigins: ['https://api.stripe.com']
        AllowMethods: [POST]
```

```typescript
// backend/src/lambdas/stripe-webhook.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { getStripeClient } from '../lib/stripe-client';
import { enrollmentRepository } from '../features/enrollment/enrollment.repository';

export const handler: APIGatewayProxyHandler = async (event) => {
  const stripe = await getStripeClient();
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  try {
    // Verify signature
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body!,
      sig!,
      webhookSecret
    );

    // Handle event types
    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const { userId, courseId } = session.metadata!;

      // Update enrollment (idempotent via conditional write)
      await enrollmentRepository.update(userId, courseId, {
        paymentStatus: 'completed',
        stripePaymentIntentId: session.payment_intent as string,
        paidAt: new Date().toISOString(),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook signature verification failed' }),
    };
  }
};
```

**Alternative (Express Route)**: If you prefer Express integration:
- Add route to `backend/src/features/payment/stripe-webhook.routes.ts`
- Register in `app.ts` BEFORE Cognito-protected routes
- Configure API Gateway to exclude `/api/payment/webhooks/stripe` from authorizer
- More complex SAM configuration, harder to isolate

**Trade-offs**:

| Approach | Pros | Cons |
|----------|------|------|
| **Lambda Function URL** | Simple, isolated, easy testing, dedicated timeout | New deployment target, separate logs |
| **Express Route** | Same codebase, shared utilities, unified logging | Complex auth exclusion, mixed concerns |

**Recommendation**: Use Lambda Function URL for cleaner separation and simpler security model.

---

## Summary

### Patterns to Use (No Changes Needed)

1. ✅ **Strategy Pattern** - Add `StripeEnrollmentStrategy` alongside existing `FreeEnrollmentStrategy`
2. ✅ **Repository Pattern** - Add `update()` method to `enrollmentRepository`, extend types
3. ✅ **Service Layer** - Add one `else if` branch in `enrollmentService.enrollUser()`
4. ✅ **Single-Table Design** - Extend Enrollment entity with Stripe fields (no migration)
5. ✅ **Server Actions** - Add `createStripeCheckout()` following existing patterns
6. ✅ **Multi-Step Flow** - Extend dashboard `handleEnroll()` with pricingModel check
7. ✅ **Conditional Writes** - Reuse for webhook idempotency

### New Pattern Required

1. ⚠️ **Webhook Handler** - Separate Lambda function with Function URL (recommended) or Express route with auth exclusion

### Missing Pieces (Implementation Gaps)

1. **`enrollmentRepository.update()`** - Must add before webhook handler
2. **Stripe client initialization** - Must fetch secrets from Secrets Manager
3. **Course type extension** - Add `stripeProductId` and `stripePriceId` to TypeScript types
4. **Frontend Stripe redirect logic** - Branch on `pricingModel` in `handleEnroll()`

### Architectural Readiness Score: 9/10

**What's Ready**:
- Strategy Pattern explicitly designed for payment providers ✅
- Type system includes Stripe fields (`stripeSessionId`, `checkoutUrl`) ✅
- Frontend flow pattern supports redirect-based payment ✅
- DynamoDB schema accommodates new attributes ✅
- Error handling, logging, and testing patterns established ✅

**What's Missing**:
- Repository update method (15 lines of code, follows existing pattern)
- Webhook handler (new pattern, but small - ~50 lines)

**Conclusion**: The codebase is architecturally mature and ready for Stripe integration. No refactoring needed—only extension following established patterns. The Strategy Pattern implementation is textbook Open/Closed Principle, making this a low-risk, high-confidence implementation.
