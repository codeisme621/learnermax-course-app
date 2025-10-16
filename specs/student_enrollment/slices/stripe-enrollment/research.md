# Research: Stripe Enrollment Integration

**Date**: 2025-10-15
**Research Question**: How does the existing enrollment flow work and where would Stripe integration naturally fit?

## Summary

LearnerMax implements a strategy-pattern-based enrollment system that currently supports free course enrollment. The system is architected to be extensible for paid enrollments through the existing strategy pattern.

Key findings:
- **Backend**: Enrollment uses a strategy pattern with a `FreeEnrollmentStrategy` already implemented. A `PaidEnrollmentStrategy` would naturally extend this pattern.
- **Authentication**: API Gateway handles Cognito authentication at infrastructure level. Webhooks would need to bypass this authorizer.
- **Frontend**: CourseCard component displays pricing but doesn't differentiate payment flows - all enrollments currently call the same API regardless of `pricingModel`.
- **Database**: Courses already have `stripeProductId` and `stripePriceId` fields in DynamoDB. Students have no Stripe-related fields yet.
- **Payment Provider**: No provider abstraction exists, but would naturally fit in `backend/src/lib/payment/` alongside other external service clients like DynamoDB.
- **Stripe Integration Type**: Using **Stripe Embedded Checkout** (not hosted). Backend returns `client_secret`, not a redirect URL. The payment form is mounted on your site, not redirected to Stripe's hosted page.

---

## 1. Existing Enrollment Flow

### Backend Architecture

#### API Endpoints (`backend/src/features/enrollment/enrollment.routes.ts`)

**POST /api/enrollments** (lines 12-43)
- **Authentication**: Required - extracts `userId` from Cognito JWT via API Gateway context
- **Request Body**: `{ courseId: string }`
- **Response**: `EnrollmentResult` with enrollment data and status
- **Flow**:
  1. Validates user authentication (returns 401 if missing)
  2. Validates `courseId` in request body (returns 400 if missing)
  3. Calls `enrollmentService.enrollUser(userId, courseId)`
  4. Returns 201 with enrollment result on success

**GET /api/enrollments** (lines 46-69)
- Retrieves all enrollments for authenticated user
- No query parameters, returns full list

**GET /api/enrollments/check/:courseId** (lines 72-92)
- Checks if user is enrolled in specific course
- Returns `{ enrolled: boolean }`

#### Service Layer (`backend/src/features/enrollment/enrollment.service.ts`)

**enrollUser() Method** (lines 10-63)

Current implementation flow:
1. **Idempotency Check** (lines 14-27): Returns existing enrollment if user already enrolled
2. **Course Validation** (lines 29-34): Fetches course, throws error if not found
3. **Strategy Selection** (lines 43-55):
   - Checks `course.pricingModel === 'free'`
   - Instantiates `new FreeEnrollmentStrategy()`
   - Calls `strategy.enroll(userId, courseId)`
   - Returns enrollment result
4. **Unsupported Models** (lines 57-62): Throws error for non-free pricing models

**Key Observation**: The service already has the strategy pattern infrastructure. Adding paid enrollment would mean:
- Adding a condition for `course.pricingModel === 'paid'`
- Instantiating a `PaidEnrollmentStrategy` (or similar)
- The paid strategy would handle Stripe checkout session creation

#### Strategy Pattern (`backend/src/features/enrollment/strategies/`)

**EnrollmentStrategy Interface** (`enrollment-strategy.interface.ts:3-5`)
```typescript
export interface EnrollmentStrategy {
  enroll(userId: string, courseId: string): Promise<EnrollmentResult>;
}
```

**FreeEnrollmentStrategy** (`free-enrollment.strategy.ts:9-29`)
- Creates enrollment object with:
  - `enrollmentType: 'free'`
  - `paymentStatus: 'free'`
  - `enrolledAt`: Current timestamp
  - `progress: 0`, `completed: false`
- Persists via `enrollmentRepository.create(enrollment)`
- Returns `{ enrollment, status: 'active' }`

**Extension Point for Paid Enrollment**:
A `PaidEnrollmentStrategy` would follow the same interface but:
- Create Stripe checkout session with `ui_mode: 'embedded'`
- Return `{ clientSecret: string, status: 'pending' }` instead of enrollment
- Frontend uses client secret to mount embedded Stripe form
- Enrollment would be created later via webhook after payment confirmation

#### Repository Layer (`backend/src/features/enrollment/enrollment.repository.ts`)

**DynamoDB Key Structure** (lines 11-18):
- `PK`: `USER#{userId}`
- `SK`: `COURSE#{courseId}`
- `GSI1PK`: `COURSE#{courseId}`
- `GSI1SK`: `USER#{userId}`
- `entityType`: `ENROLLMENT`

**create() Method** (lines 10-46):
- Uses `PutCommand` with `ConditionExpression: 'attribute_not_exists(PK)'` to prevent duplicates
- Spreads all enrollment fields into DynamoDB item

**get() Method** (lines 48-82):
- Direct key access by userId and courseId
- Returns `undefined` if not found

### Frontend Architecture

#### Dashboard Flow (`frontend/components/dashboard/DashboardContent.tsx`)

**Initialization** (lines 37-84):
1. Checks `sessionStorage` for `pendingEnrollmentCourseId` (from landing page CTAs)
2. If found, auto-enrolls via `enrollInCourse()` API call
3. Clears sessionStorage after enrollment attempt
4. Fetches all courses and user enrollments

**Manual Enrollment Handler** (lines 87-100):
```typescript
const handleEnroll = async (courseId: string) => {
  const result = await enrollInCourse(courseId);  // No pricing model check

  if (result.success) {
    const updatedEnrollments = await getUserEnrollments();
    if (updatedEnrollments) {
      setEnrollments(updatedEnrollments);
    }
  } else {
    throw new Error(result.error || 'Failed to enroll');
  }
};
```

**Current Behavior**: Calls enrollment API for all courses regardless of `pricingModel`.

**Gap**: Does not check `course.pricingModel` before calling enrollment API. Paid courses should trigger Stripe checkout instead.

#### CourseCard Component (`frontend/components/dashboard/CourseCard.tsx`)

**Badge Display** (lines 54-63):
- Shows "Enrolled" badge if user enrolled
- Shows "Free" or `$${course.price}` based on `course.pricingModel`

**Enroll Now Button** (lines 140-154):
- Calls `handleEnrollClick()` when clicked
- Triggers `onEnroll(course.courseId)` callback
- Shows loading state during enrollment
- Displays error if enrollment fails

**Current Behavior**: Button executes same logic for both free and paid courses.

**Gap**: Should check `course.pricingModel` and:
- For free courses: Call existing enrollment API
- For paid courses: Initiate Stripe checkout flow

#### Enrollment API (`frontend/app/actions/enrollments.ts`)

**enrollInCourse() Function** (lines 44-102):
- Endpoint: `POST ${API_URL}/api/enrollments`
- Headers: `Authorization: Bearer ${token}`
- Body: `{ courseId: string }`
- Returns: `{ success: boolean, enrollment?: Enrollment, status?: 'active' | 'pending' }`

**Current Behavior**: Single enrollment function for all course types.

**Gap**: Needs separate function or conditional logic for paid enrollments that would:
- Create Stripe checkout session with `ui_mode: 'embedded'`
- Return client secret (not a URL - embedded form stays on site)
- Mount Stripe embedded form using the client secret

---

## 2. Authentication and Webhook Handling

### Current Authentication Architecture

#### Infrastructure-Level Authentication

**API Gateway Cognito Authorizer** (`backend/template.yaml:362-368`)
```yaml
Auth:
  DefaultAuthorizer: CognitoAuthorizer
  Authorizers:
    CognitoAuthorizer:
      UserPoolArn: !GetAtt LearnerMaxUserPool.Arn
      Identity:
        Header: Authorization
```

**How It Works**:
1. API Gateway validates JWT from `Authorization` header BEFORE request reaches Lambda
2. Valid tokens result in user claims injected into `requestContext.authorizer`
3. Invalid/missing tokens rejected with 401 by API Gateway (Lambda never invoked)
4. Lambda Web Adapter passes `requestContext` via `x-amzn-request-context` header

**Key Implication for Webhooks**: Stripe webhooks cannot use Cognito authentication. A separate route configuration is needed.

#### Application-Level Authorization

**Auth Utils** (`backend/src/lib/auth-utils.ts`)

**getUserIdFromContext()** (lines 61-86):
- Reads `x-amzn-request-context` header
- Parses JSON to extract `sub` claim from Cognito
- Returns `null` if header missing or invalid
- Supports both API Gateway v1 and v2 formats

**Route-Level Authorization Pattern**:
Every protected route manually checks for user identity:
```typescript
const userId = getUserIdFromContext(req);
if (!userId) {
  res.status(401).json({ error: 'Unauthorized' });
  return;
}
```

Examples:
- `enrollment.routes.ts:16-20` (POST enrollment)
- `student.routes.ts:13-17` (GET student profile)

#### Unauthenticated Routes

**Course Routes** (`backend/src/features/courses/course.routes.ts`)
- `GET /api/courses` (lines 10-24): Public course catalog
- `GET /api/courses/:courseId` (lines 27-46): Public course details
- Neither route calls `getUserIdFromContext()`
- Both are publicly accessible despite API Gateway default authorizer

**How Unauthenticated Routes Work**:
Public routes still go through API Gateway but don't require valid Cognito tokens. The routes simply don't check for `userId` in the handler.

### Webhook Handling Pattern (for Stripe)

**No HTTP Webhooks Currently Exist**

Existing event handlers are Lambda-specific:
- **PostConfirmation Lambda** (`backend/src/lambdas/post-confirmation.ts`): Cognito trigger, not HTTP
- **StudentOnboarding Lambda** (`backend/src/lambdas/student-onboarding.ts`): SNS trigger, not HTTP

**Where Stripe Webhook Would Fit**:

Based on existing route patterns, a Stripe webhook endpoint would be structured as:

**Option 1: Add to Express App** (`backend/src/app.ts`)
```typescript
// Would need to be added
app.use('/api/webhooks', webhookRoutes);  // New route group
```

With a new route file: `backend/src/features/webhooks/stripe-webhook.routes.ts`

The webhook route would:
1. NOT call `getUserIdFromContext()` (no authentication)
2. Verify Stripe signature instead (using Stripe SDK)
3. Process webhook events (e.g., `checkout.session.completed`)
4. Create enrollment records for successful payments

**Option 2: Separate Lambda Function** (following existing pattern)
Create a dedicated Lambda function like existing triggers, configured with:
- HTTP endpoint via API Gateway (without Cognito authorizer)
- Stripe webhook signature verification
- Dedicated route in `template.yaml`

**Recommended Approach**: Option 1 (Express route) because:
- Keeps HTTP APIs together
- Can reuse existing services and repositories
- Easier to test locally
- Follows Express app structure already in place

**Template Configuration Needed** (`backend/template.yaml`):
```yaml
# Would need explicit path without authorizer
ApiGatewayApi:
  Properties:
    DefinitionBody:
      paths:
        /api/webhooks/stripe:
          post:
            security: []  # Override default authorizer
```

---

## 3. Frontend CourseCard and Dashboard

### Current Implementation

#### CourseCard Display Logic

**File**: `frontend/components/dashboard/CourseCard.tsx`

**Badge Display** (lines 54-63):
```typescript
{!enrollment ? (
  <Badge className={course.pricingModel === 'free' ? 'bg-green-500' : 'bg-blue-500'}>
    {course.pricingModel === 'free' ? 'Free' : `$${course.price}`}
  </Badge>
) : (
  <Badge className="bg-green-500">Enrolled</Badge>
)}
```
- Uses `course.pricingModel` to determine badge color and text
- Shows price for paid courses
- Shows "Enrolled" for enrolled courses regardless of how they enrolled

**Enroll Now Button** (lines 140-154):
```typescript
<Button
  onClick={handleEnrollClick}
  disabled={isEnrolling || !onEnroll}
  className="w-full"
>
  {isEnrolling ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Enrolling...
    </>
  ) : (
    'Enroll Now'
  )}
</Button>
```
- Same button for all pricing models
- Shows loading state during enrollment
- Disabled state when enrollment in progress

**Enrollment Handler** (lines 25-38):
```typescript
const handleEnrollClick = async () => {
  if (!onEnroll) return;

  setError(null);
  setIsEnrolling(true);

  try {
    await onEnroll(course.courseId);  // No pricing model check
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to enroll');
  } finally {
    setIsEnrolling(false);
  }
};
```
- Calls parent `onEnroll` callback for ALL courses
- No conditional logic based on `course.pricingModel`

#### Dashboard Enrollment Management

**File**: `frontend/components/dashboard/DashboardContent.tsx`

**State** (lines 20-23):
- `courses`: All available courses
- `enrollments`: User's enrollments
- `isLoading`: Loading state
- `error`: Error messages

**Enrollment Lookup** (lines 32-35):
```typescript
const enrollmentMap = new Map<string, Enrollment>();
enrollments.forEach((enrollment) => {
  enrollmentMap.set(enrollment.courseId, enrollment);
});
```
Creates O(1) lookup for checking enrollment status per course.

**Course Rendering** (lines 193-204):
```typescript
{courses.map((course) => (
  <CourseCard
    key={course.courseId}
    course={course}
    enrollment={enrollmentMap.get(course.courseId)}
    onEnroll={handleEnroll}
  />
))}
```
Passes enrollment object if exists, `undefined` otherwise.

**Auto-Enrollment from Landing Page** (lines 43-58):
```typescript
const pendingCourseId = sessionStorage.getItem('pendingEnrollmentCourseId');
if (pendingCourseId) {
  sessionStorage.removeItem('pendingEnrollmentCourseId');
  await enrollInCourse(pendingCourseId);  // No pricing model check
}
```
- Checks sessionStorage for pending enrollment
- Immediately enrolls without checking course pricing
- Clears sessionStorage after attempt

#### Landing Page CTA Flow

**HeroSection** (`frontend/components/landing/HeroSection.tsx:17-22`):
```typescript
const handleEnrollClick = () => {
  sessionStorage.setItem('pendingEnrollmentCourseId', course.id);
  router.push('/enroll');
};
```

**CtaSection** (`frontend/components/landing/CtaSection.tsx:11-15`):
```typescript
const handleGetStartedClick = () => {
  sessionStorage.setItem('pendingEnrollmentCourseId', 'TEST-COURSE-001');
  router.push('/enroll');
};
```

Both store course ID in sessionStorage and navigate to `/enroll` page (which redirects to dashboard after auth).

### What's Missing for Stripe

#### Gap 1: Conditional Enrollment Logic in CourseCard

**Location**: `frontend/components/dashboard/CourseCard.tsx:25-38`

**Current State**: `handleEnrollClick` calls `onEnroll(courseId)` for all courses.

**What's Needed**:
- Check `course.pricingModel` before calling enrollment
- For `pricingModel === 'paid'`:
  - Navigate to a new checkout page/route (e.g., `/checkout?courseId={courseId}`)
  - Checkout page renders `EmbeddedCheckoutProvider` with `fetchClientSecret` function
  - `fetchClientSecret` calls backend to create session with `course.stripePriceId`
  - `EmbeddedCheckout` component mounts the Stripe form
- For `pricingModel === 'free'`:
  - Continue current behavior (call existing enrollment API)

#### Gap 2: Stripe Checkout Initiation

**Current State**: No Stripe integration exists in frontend.

**What's Needed**:
- New action function in `frontend/app/actions/enrollments.ts`:
  - `createStripeCheckout(courseId)` or similar
  - Calls backend API to create Stripe checkout session
  - Returns client secret for embedded form
- Stripe configuration:
  - Stripe publishable key environment variable: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - Install `@stripe/stripe-js` and `@stripe/react-stripe-js` packages
  - Use React Stripe.js components: `EmbeddedCheckoutProvider` and `EmbeddedCheckout`
  - Example mounting pattern:
    ```typescript
    import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
    import { loadStripe } from '@stripe/stripe-js'

    const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ fetchClientSecret }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
    ```

#### Gap 3: Auto-Enrollment Pricing Check

**Location**: `frontend/components/dashboard/DashboardContent.tsx:43-58`

**Current State**: Auto-enrolls without checking course pricing.

**What's Needed**:
- Fetch course details for `pendingCourseId`
- Check `course.pricingModel`
- If `paid`: Initiate Stripe checkout
- If `free`: Continue current auto-enrollment

#### Gap 4: Payment Success Return Flow

**Current State**: No implementation.

**What's Needed**:
- Return page specified in Stripe session `return_url` (e.g., `/enrollment/return?session_id={CHECKOUT_SESSION_ID}`)
- Page retrieves session ID from URL query parameter
- Calls backend to verify Checkout Session status
- Handle session status:
  - `complete`: Payment succeeded - show success message, redirect to dashboard
  - `open`: Payment failed/canceled - remount checkout or show error
- Components needed:
  - New route: `app/enrollment/return/page.tsx`
  - Server action to retrieve session status

#### Gap 5: Course Type Stripe Fields

**Location**: `frontend/app/actions/courses.ts:26-36`

**Current State**:
```typescript
export interface Course {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  pricingModel: 'free' | 'paid';
  price?: number;
  imageUrl: string;
  learningObjectives: string[];
  curriculum: CourseModule[];
}
```

**What's Missing**:
- `stripeProductId?: string` - Stripe product identifier
- `stripePriceId?: string` - Stripe price identifier

These fields exist in the backend/database but not in frontend Course type.

#### Gap 6: Enrollment Type Display

**Location**: `frontend/components/dashboard/CourseCard.tsx`

**Current State**: Shows "Enrolled" badge for all enrolled users, regardless of how they enrolled.

**Optional Enhancement**: Could show different badge or indicator for paid enrollments vs free enrollments using `enrollment.enrollmentType` field (which already exists in the type but isn't rendered).

---

## 4. DynamoDB Schema - Stripe Fields

### Course Schema

#### Type Definition

**File**: `backend/src/features/courses/course.types.ts:14-24`

**Current TypeScript Interface**:
```typescript
interface Course {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  pricingModel: 'free' | 'paid';
  price?: number;
  imageUrl: string;
  learningObjectives: string[];
  curriculum: CourseModule[];
}
```

**Missing in TypeScript**:
- `stripeProductId?: string`
- `stripePriceId?: string`

#### Actual Database Schema

**File**: DynamoDB `learnermax-education-prod` table

**Paid Course Example** (TEST-COURSE-005 - AWS Cloud Mastery, $149.99):
```json
{
  "PK": "COURSE#TEST-COURSE-005",
  "SK": "METADATA",
  "GSI1PK": "COURSE",
  "GSI1SK": "METADATA",
  "entityType": "COURSE",
  "courseId": "TEST-COURSE-005",
  "name": "AWS Cloud Mastery",
  "pricingModel": "paid",
  "price": 149.99,
  "stripeProductId": "prod_TF8hQvt5PazLWQ",
  "stripePriceId": "price_1SIeQEQ0A0bb7l8VrpD9MOwT",
  // ... other fields
}
```

**Paid Course Example** (TEST-COURSE-003 - Full-Stack Development Bootcamp, $99.99):
```json
{
  "stripeProductId": "prod_TF8hrJSyQlMQNC",
  "stripePriceId": "price_1SIeQGQ0A0bb7l8VOe6dfOoI"
}
```

**Key Observation**: Stripe fields already exist in database (added via AWS CLI script) but not reflected in TypeScript types.

#### Repository Implementation

**File**: `backend/src/features/courses/course.repository.ts:10-35`

**create() Method** (lines 12-18):
```typescript
const item = {
  PK: `COURSE#${course.courseId}`,
  SK: 'METADATA',
  entityType: 'COURSE',
  ...course,  // Spreads all course fields
  // Set GSI keys after spread to ensure they're not overwritten
  GSI1PK: 'COURSE',
  GSI1SK: 'METADATA',
};
```

**Key Observation**: The spread operator (`...course`) means any fields in the Course object will be stored, even if not in the TypeScript interface. This is why Stripe fields exist in the database despite not being in the type.

**get() Method** (lines 37-66):
- Returns entire item after stripping DynamoDB keys
- Would include `stripeProductId` and `stripePriceId` if present in database

**Implication**: Adding `stripeProductId` and `stripePriceId` to the Course TypeScript interface will:
1. Make TypeScript aware of these fields
2. Enable type checking and autocomplete
3. Not change database behavior (fields already stored and retrieved)

### Student Schema

#### Type Definition

**File**: `backend/src/features/students/student.types.ts:1-9`

**Current TypeScript Interface**:
```typescript
interface Student {
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  signUpMethod?: 'email' | 'google';
  createdAt: string;
  updatedAt: string;
}
```

**Missing Stripe Fields**:
- `stripeCustomerId?: string` - Stripe customer ID for the student (needed for future payments)
- No payment method storage
- No payment history fields

**Note**: PaymentIntent ID should be stored in the Enrollment record (not Student) since it's per-transaction. Needed for issuing refunds.

#### Actual Database Schema

**DynamoDB Storage** (from `backend/src/features/students/student.repository.ts:12-19`):
```typescript
{
  PK: `USER#{userId}`,
  SK: `METADATA`,
  GSI1PK: `USER#{userId}`,
  GSI1SK: `METADATA`,
  entityType: `USER`,
  ...student  // All student fields spread here
}
```

**Current Database Content**: No Stripe-related fields exist in actual student records.

**Where Student Stripe Data Would Be Stored**:

After a student makes a payment via Stripe:
1. Stripe creates a Stripe Customer ID (e.g., `cus_xxxxx`)
2. This ID should be stored in the Student record: `stripeCustomerId`
3. Future payments for the same student would reuse this customer ID

**Storage Options**:

**Option A**: Add to Student record directly
```typescript
interface Student {
  // ... existing fields
  stripeCustomerId?: string;  // Populated after first payment
}
```

**Option B**: Separate Payment entity
```typescript
// New entity type
{
  PK: `USER#{userId}`,
  SK: `PAYMENT#{paymentId}`,
  entityType: `PAYMENT`,
  stripeCustomerId: string,
  stripePaymentIntentId: string,
  amount: number,
  courseId: string,
  // ...
}
```

**Recommended**: Option A (add to Student record) because:
- Stripe customer ID is a one-per-student identifier
- Needed for future payments to same customer
- Simpler access pattern (no additional queries)
- Payment history can be tracked via Stripe dashboard or webhook event storage

### Enrollment Schema (Related)

#### Type Definition

**File**: `backend/src/features/enrollment/enrollment.types.ts:1-11`

**Current Interface**:
```typescript
interface Enrollment {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid' | 'bundle';
  enrolledAt: string;
  paymentStatus: 'free' | 'pending' | 'completed';
  stripeSessionId?: string;  // Already exists!
  progress: number;
  completed: boolean;
  completedAt?: string;
}
```

**Existing Stripe Fields**:
- `stripeSessionId`: Tracks Stripe checkout session

**Missing Stripe Field for Refunds**:
- `stripePaymentIntentId?: string` - **REQUIRED for issuing refunds** via Stripe API

**Observations**:
- Enrollment already has Stripe integration in the schema
- `enrollmentType: 'paid'` option exists
- `paymentStatus: 'pending' | 'completed'` supports payment flows
- The schema is already prepared for paid enrollments
- **Need to add**: `stripePaymentIntentId` field to enable refund functionality

**DynamoDB Storage** (from `backend/src/features/enrollment/enrollment.repository.ts:11-18`):
```typescript
{
  PK: `USER#{userId}`,
  SK: `COURSE#{courseId}`,
  GSI1PK: `COURSE#{courseId}`,
  GSI1SK: `USER#{userId}`,
  entityType: `ENROLLMENT`,
  ...enrollment  // Includes stripeSessionId if present
}
```

### Summary of Schema Changes Needed

#### Course Entity
**TypeScript Changes**:
```typescript
// backend/src/features/courses/course.types.ts
interface Course {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  pricingModel: 'free' | 'paid';
  price?: number;
  stripeProductId?: string;  // ADD THIS
  stripePriceId?: string;    // ADD THIS
  imageUrl: string;
  learningObjectives: string[];
  curriculum: CourseModule[];
}
```

**Database**: No changes needed - fields already exist in DynamoDB for paid courses.

**Frontend Changes**:
```typescript
// frontend/app/actions/courses.ts
export interface Course {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  pricingModel: 'free' | 'paid';
  price?: number;
  stripeProductId?: string;  // ADD THIS
  stripePriceId?: string;    // ADD THIS
  imageUrl: string;
  learningObjectives: string[];
  curriculum: CourseModule[];
}
```

#### Student Entity
**TypeScript Changes**:
```typescript
// backend/src/features/students/student.types.ts
interface Student {
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  signUpMethod?: 'email' | 'google';
  stripeCustomerId?: string;  // ADD THIS - populated after first payment
  createdAt: string;
  updatedAt: string;
}
```

**Database**: Field would be added dynamically when student makes first payment (spread operator in repository.create() will store it).

**When Populated**: After first Stripe payment, webhook handler would update student record with Stripe customer ID.

#### Enrollment Entity
**TypeScript Changes**:
```typescript
// backend/src/features/enrollment/enrollment.types.ts
interface Enrollment {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid' | 'bundle';
  enrolledAt: string;
  paymentStatus: 'free' | 'pending' | 'completed';
  stripeSessionId?: string;         // Already exists
  stripePaymentIntentId?: string;   // ADD THIS - required for refunds
  progress: number;
  completed: boolean;
  completedAt?: string;
}
```

**Database**: Field would be added dynamically via spread operator when webhook creates enrollment record.

**When Populated**: Webhook handler extracts `payment_intent` from `checkout.session.completed` event and stores it.

---

## 5. Payment Provider Abstraction Location

### Existing Patterns

The codebase has two main organizational patterns for external integrations:

#### Pattern 1: Feature-Nested Strategies

**Example**: `backend/src/features/enrollment/strategies/`
```
enrollment/
├── strategies/
│   ├── enrollment-strategy.interface.ts
│   ├── free-enrollment.strategy.ts
│   └── __tests__/
```

- Strategies nested within their parent feature
- Used for business logic variations (free vs paid enrollment)
- Strategies implement an interface and are selected at runtime

#### Pattern 2: Shared Library Clients

**Example**: `backend/src/lib/dynamodb.ts`
```
lib/
├── dynamodb.ts      # DynamoDB client
├── logger.ts        # Logger utility
├── metrics.ts       # Metrics utility
└── auth-utils.ts    # Auth utilities
```

- External service clients live in `lib/`
- Singleton pattern for client initialization
- Shared across all features via direct imports

### Where Payment Provider Would Fit

Based on the existing patterns, a Payment Provider abstraction would naturally fit in:

**Option 1: Shared Library** (`backend/src/lib/payment/`)
```
backend/src/lib/
├── payment/
│   ├── payment-provider.interface.ts
│   ├── stripe-provider.ts
│   └── __tests__/
```

**Rationale**:
- Follows DynamoDB client pattern (`lib/dynamodb.ts`)
- Payment providers are external service integrations
- Could be reused across features (enrollment, refunds, etc.)
- Makes adding new providers (PayPal, etc.) clear and organized

**Import Pattern** (from enrollment strategy):
```typescript
import { stripeProvider } from '../../../lib/payment/stripe-provider.js';
```

**Option 2: Enrollment Feature Providers** (`backend/src/features/enrollment/providers/`)
```
backend/src/features/enrollment/
├── providers/
│   ├── payment-provider.interface.ts
│   ├── stripe-provider.ts
│   └── __tests__/
├── strategies/
│   ├── enrollment-strategy.interface.ts
│   ├── free-enrollment.strategy.ts
│   ├── paid-enrollment.strategy.ts
│   └── __tests__/
```

**Rationale**:
- Keeps payment logic close to enrollment feature
- Nested like strategies
- Easier to find all enrollment-related code in one place

**Import Pattern** (from enrollment strategy):
```typescript
import { stripeProvider } from '../providers/stripe-provider.js';
```

### Recommended Approach

**Recommendation**: **Option 1** (`backend/src/lib/payment/`)

**Reasons**:
1. **Follows Existing Pattern**: External service clients (DynamoDB, AWS SDK) live in `lib/`
2. **Separation of Concerns**: Payment processing is infrastructure, not business logic
3. **Reusability**: Payment providers might be used beyond enrollment (refunds, subscriptions, etc.)
4. **Future Extensibility**: Adding PayPal, Square, etc. would be clearer in a dedicated `payment/` directory
5. **Testing**: Easier to mock and test payment integrations when isolated

### Implementation Structure

**Payment Provider Interface** (`backend/src/lib/payment/payment-provider.interface.ts`):
```typescript
export interface PaymentProvider {
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
  verifyWebhookSignature(body: string, signature: string): boolean;
  // Future methods for refunds, subscriptions, etc.
}
```

**Stripe Implementation** (`backend/src/lib/payment/stripe-provider.ts`):
```typescript
import Stripe from 'stripe';
import type { PaymentProvider } from './payment-provider.interface.js';

export class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    // Initialize Stripe SDK with secret key from Secrets Manager
  }

  async createCheckoutSession(params) {
    // Create Stripe checkout session
  }

  verifyWebhookSignature(body, signature) {
    // Verify Stripe webhook signature
  }
}

export const stripeProvider = new StripePaymentProvider();
```

**Usage in Paid Enrollment Strategy** (`backend/src/features/enrollment/strategies/paid-enrollment.strategy.ts`):
```typescript
import type { EnrollmentStrategy } from './enrollment-strategy.interface.js';
import { stripeProvider } from '../../../lib/payment/stripe-provider.js';

export class PaidEnrollmentStrategy implements EnrollmentStrategy {
  async enroll(userId: string, courseId: string): Promise<EnrollmentResult> {
    const session = await stripeProvider.createCheckoutSession({
      userId,
      courseId,
      // ... params
    });

    return {
      clientSecret: session.client_secret,  // For embedded form
      status: 'pending'
    };
  }
}
```

### What Doesn't Exist Today

**Payment Provider Abstraction**: Completely absent from codebase.

**Files That Would Need to Be Created**:

**Backend:**
1. `backend/src/lib/payment/payment-provider.interface.ts` - Interface definition
2. `backend/src/lib/payment/stripe-provider.ts` - Stripe implementation
3. `backend/src/lib/payment/__tests__/stripe-provider.test.ts` - Tests
4. `backend/src/features/enrollment/strategies/paid-enrollment.strategy.ts` - Paid enrollment strategy
5. `backend/src/features/webhooks/stripe-webhook.routes.ts` - Webhook endpoint (or similar)

**Frontend:**
1. `frontend/app/checkout/page.tsx` - Checkout page with embedded Stripe form
2. `frontend/app/enrollment/return/page.tsx` - Return page after payment
3. `frontend/app/actions/stripe.ts` - Stripe-related server actions (fetchClientSecret, etc.)

**Existing Files That Would Be Modified**:

**Backend:**
1. `backend/src/features/enrollment/enrollment.service.ts` - Add paid strategy selection
2. `backend/src/app.ts` - Register webhook routes
3. `backend/template.yaml` - Configure webhook endpoint without authorizer
4. `backend/src/features/courses/course.types.ts` - Add Stripe field types (stripeProductId, stripePriceId)
5. `backend/src/features/students/student.types.ts` - Add Stripe customer ID field
6. `backend/src/features/enrollment/enrollment.types.ts` - Add stripePaymentIntentId to Enrollment, add clientSecret to EnrollmentResult

**Frontend:**
1. `frontend/components/dashboard/CourseCard.tsx` - Add pricing model check in enrollment handler
2. `frontend/app/actions/courses.ts` - Add Stripe fields to Course interface
3. `frontend/package.json` - Add `@stripe/stripe-js` and `@stripe/react-stripe-js` dependencies
4. `frontend/.env.local` - Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` environment variable

---

## Code References

### Backend Enrollment Flow
- `backend/src/features/enrollment/enrollment.routes.ts:12-43` - POST enrollment endpoint
- `backend/src/features/enrollment/enrollment.service.ts:10-63` - enrollUser() method with strategy selection
- `backend/src/features/enrollment/strategies/enrollment-strategy.interface.ts:3-5` - Strategy interface
- `backend/src/features/enrollment/strategies/free-enrollment.strategy.ts:9-29` - Free strategy implementation
- `backend/src/features/enrollment/enrollment.repository.ts:10-46` - Database create operation

### Authentication
- `backend/template.yaml:362-368` - API Gateway Cognito authorizer configuration
- `backend/src/lib/auth-utils.ts:61-86` - getUserIdFromContext() function
- `backend/src/features/courses/course.routes.ts:10-24` - Example unauthenticated route

### Frontend Enrollment Flow
- `frontend/components/dashboard/CourseCard.tsx:25-38` - Enrollment click handler
- `frontend/components/dashboard/CourseCard.tsx:140-154` - Enroll Now button
- `frontend/components/dashboard/DashboardContent.tsx:87-100` - Dashboard enrollment handler
- `frontend/app/actions/enrollments.ts:44-102` - enrollInCourse() API call

### Database Schema
- `backend/src/features/courses/course.types.ts:14-24` - Course TypeScript type
- `backend/src/features/students/student.types.ts:1-9` - Student TypeScript type
- `backend/src/features/enrollment/enrollment.types.ts:1-11` - Enrollment TypeScript type with stripeSessionId
- `backend/src/features/courses/course.repository.ts:12-18` - Course DynamoDB storage structure
- `backend/template.yaml:134-176` - DynamoDB table definition

### External Service Pattern
- `backend/src/lib/dynamodb.ts:1-15` - Example external client (DynamoDB)
- `backend/src/features/enrollment/enrollment.service.ts:1-5` - Service import pattern

---

## Architecture Documentation

### Strategy Pattern for Enrollment

The enrollment system uses the Strategy Pattern to handle different enrollment types:

**Interface**: `EnrollmentStrategy` with single method `enroll(userId, courseId)`

**Implementations**:
- `FreeEnrollmentStrategy` - Handles free course enrollments

**Selection Logic**: Service layer checks `course.pricingModel` and instantiates appropriate strategy

**Extensibility**: Adding paid enrollment requires:
1. Create `PaidEnrollmentStrategy` implementing `EnrollmentStrategy`
2. Add condition in `enrollment.service.ts` for `pricingModel === 'paid'`
3. Strategy handles Stripe checkout session creation

### Single-Table DynamoDB Design

All entities stored in one table using composite keys:

**Course**: `PK=COURSE#{courseId}, SK=METADATA`
**Student**: `PK=USER#{userId}, SK=METADATA`
**Enrollment**: `PK=USER#{userId}, SK=COURSE#{courseId}`

**GSI1** enables reverse lookups:
- Enrollments by course: `GSI1PK=COURSE#{courseId}`
- Email lookup for students: `email-index`

### Authentication Flow

**Infrastructure → Application Authorization**:
1. API Gateway validates Cognito JWT (infrastructure level)
2. Lambda Web Adapter passes context via header
3. Route handlers extract userId and check authorization (application level)

**Public Routes**: Simply don't check for userId, still go through API Gateway

**Webhook Pattern**: Would need explicit `security: []` override in API Gateway config

### Repository Pattern

All data access through repository objects:
- Object literal exports (not classes)
- Async methods for CRUD operations
- Direct import of DynamoDB client from `lib/`

### Service Pattern

Business logic in service classes:
- Singleton instances exported alongside class
- Services orchestrate repositories and strategies
- Cross-feature dependencies (enrollment service imports course repository)

### Stripe Integration Pattern (Embedded Checkout)

**Backend:**
- Creates Checkout Session with `ui_mode: 'embedded'`
- Returns `client_secret` (not a redirect URL)
- Webhook handler processes payment completion

**Frontend (React Stripe.js):**
- Installs `@stripe/stripe-js` and `@stripe/react-stripe-js` packages
- Uses `loadStripe()` to initialize Stripe with publishable key
- Wraps checkout UI in `EmbeddedCheckoutProvider` component
- Renders `EmbeddedCheckout` component which mounts the form
- Provides `fetchClientSecret` callback function to provider
- After payment, Stripe redirects to `return_url` with session ID

**Flow:**
1. User clicks "Enroll Now" on paid course
2. Frontend navigates to `/checkout?courseId={courseId}`
3. Checkout page renders with `EmbeddedCheckoutProvider`
4. Provider calls `fetchClientSecret` which hits backend API
5. Backend creates Stripe session and returns `client_secret`
6. `EmbeddedCheckout` component mounts form in iframe
7. User completes payment in embedded form
8. Stripe redirects to `/enrollment/return?session_id={SESSION_ID}`
9. Return page verifies payment status with backend
10. Webhook creates enrollment record in database (captures `stripeSessionId` and `stripePaymentIntentId` for refunds)
11. User sees success message and returns to dashboard

---

## Implementation Decisions

### 1. Webhook Endpoint Structure
**Decision**: Add to Express app as `/api/webhooks/stripe`

**Rationale**:
- Keeps HTTP APIs together
- Can reuse existing services and repositories
- Easier to test locally
- Follows Express app structure already in place

**Implementation**:
- Route file: `backend/src/features/webhooks/stripe-webhook.routes.ts`
- Mount in `backend/src/app.ts`: `app.use('/api/webhooks', webhookRoutes)`
- Configure in `backend/template.yaml` with `security: []` to override default Cognito authorizer

### 2. Payment Success Flow
**Decision**: Rely on webhook to create enrollment and redirect immediately

**Rationale**:
- Webhooks are more reliable than relying on user returning to success page
- User might close browser before redirect completes
- Stripe retries webhooks automatically if delivery fails
- Frontend can poll/check enrollment status on return page if needed

**Implementation**:
- Return page checks enrollment status after redirect
- If not yet created (webhook processing), show loading state
- Poll backend until enrollment appears or timeout

### 3. Stripe Customer Creation
**Decision**: During first checkout (lazy creation)

**Rationale**:
- Don't create Stripe customers for users who never make purchases
- Reduces Stripe API calls and potential costs
- Simpler - no need to integrate with student registration flow

**Implementation**:
- `PaidEnrollmentStrategy` checks if student has `stripeCustomerId`
- If not: Create Stripe customer and update student record
- If yes: Reuse existing customer ID

### 4. Error Handling for Failed Webhooks
**Decision**: Synchronous processing with SQS fallback queue

**Architecture**:
1. **Primary Path (Synchronous)**:
   - Stripe webhook → `/api/webhooks/stripe` endpoint
   - Attempt to process webhook synchronously
   - If fails: Retry up to 3 times (total 3 attempts)

2. **Fallback Path (Asynchronous)**:
   - If all 3 sync attempts fail: Publish to SQS queue
   - Separate Lambda processes messages from SQS queue
   - Max 5 retries before moving to DLQ

3. **Response to Stripe**:
   - Return **200** if: Processing succeeds OR SQS publish succeeds
   - Return **500** if: Processing fails AND SQS publish fails
   - 500 signals Stripe to retry the webhook later

**Webhook Endpoint Logic**:
```typescript
// Pseudocode
async function handleStripeWebhook(event) {
  // Try synchronous processing with retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await processWebhook(event);
      return 200; // Success!
    } catch (error) {
      if (attempt === 3) break; // All sync retries exhausted
      await sleep(100 * attempt); // Brief backoff
    }
  }

  // Sync failed - fallback to SQS
  try {
    await sqsClient.sendMessage({ body: JSON.stringify(event) });
    return 200; // Queued for async processing
  } catch (error) {
    return 500; // Both sync and queue failed - Stripe should retry
  }
}
```

**SAM Template Configuration**:
```yaml
# In backend/template.yaml
WebhookQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: stripe-webhook-queue-${Environment}
    VisibilityTimeout: 300  # 5 minutes for processor Lambda
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt WebhookDLQ.Arn
      maxReceiveCount: 5

WebhookDLQ:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: stripe-webhook-dlq-${Environment}

WebhookDLQAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: stripe-webhook-dlq-alarm-${Environment}
    MetricName: ApproximateNumberOfMessagesVisible
    Namespace: AWS/SQS
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 1
    Threshold: 1
    ComparisonOperator: GreaterThanOrEqualToThreshold
    Dimensions:
      - Name: QueueName
        Value: !GetAtt WebhookDLQ.QueueName

WebhookProcessorFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src/lambdas/webhook-processor.handler
    Timeout: 300
    Environment:
      Variables:
        EDUCATION_TABLE_NAME: !Ref EducationTable
    Policies:
      - DynamoDBCrudPolicy:
          TableName: !Ref EducationTable
    Events:
      SQSEvent:
        Type: SQS
        Properties:
          Queue: !GetAtt WebhookQueue.Arn
          BatchSize: 1
```

**Benefits**:
- **Fast happy path**: Most webhooks succeed immediately (no queue latency)
- **Resilient**: SQS fallback for transient failures (DB connection issues, etc.)
- **Proper signaling**: HTTP status codes tell Stripe when to retry
- **Visibility**: DLQ + CloudWatch alarms for persistent failures
- **Replay capability**: Can manually process failed messages from DLQ

### 5. Secrets Management
**Decision**: No caching - fetch from AWS Secrets Manager on every request

**Rationale**:
- Simpler implementation
- Always get latest secrets (handles rotation automatically)
- Secrets Manager has low latency (~100ms)
- Cache invalidation complexity not worth it for initial implementation

**Implementation**:
- Each Stripe API call fetches secrets first
- Can optimize later if latency becomes an issue
- AWS SDK handles connection pooling automatically

**Future Optimization** (if needed):
- Cache secrets in memory with TTL
- Listen for secret rotation events via EventBridge
- Invalidate cache when rotation detected
