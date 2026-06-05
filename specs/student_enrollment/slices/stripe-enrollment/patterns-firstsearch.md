# Pattern Analysis: Stripe Enrollment

**Date**: 2025-10-15
**Spec**: `specs/student_enrollment/slices/stripe-enrollment/stripe-enrollment.md`

## Executive Summary

The LearnerMax codebase already implements the foundational patterns needed for Stripe enrollment:
- **Strategy Pattern** for enrollment types (free/paid)
- **Repository Pattern** for DynamoDB data access
- **Service Layer Pattern** for business logic orchestration
- **Event-Driven Architecture** for async processing (SNS/Lambda)
- **Server Actions Pattern** for secure frontend-backend communication

**Primary Recommendation:** Extend existing patterns rather than introducing new ones. The architecture is well-designed for this feature extension.

---

## Existing Patterns Found

### 1. Strategy Pattern (Behavioral)

**Location**: `backend/src/features/enrollment/strategies/`

**Current Implementation:**
- **Interface**: `enrollment-strategy.interface.ts:3-5`
  ```typescript
  export interface EnrollmentStrategy {
    enroll(userId: string, courseId: string): Promise<EnrollmentResult>;
  }
  ```
- **Implementation**: `free-enrollment.strategy.ts:8-30` - Handles free course enrollment
- **Selection Logic**: `enrollment.service.ts:44-55` - Selects strategy based on `course.pricingModel`

**Usage Consistency**: Highly consistent and intentionally designed for extension
- Service layer delegates to strategy without knowing implementation details
- Type system already includes fields for paid enrollment (`stripeSessionId`, `checkoutUrl`)
- Currently throws error for `pricingModel === 'paid'` (line 62), explicitly marking extension point

**Pattern Strength**: Strong foundation for adding `PaidEnrollmentStrategy`

---

### 2. Repository Pattern (Structural)

**Location**: `backend/src/features/*/repository.ts` files

**Current Implementations:**
- `enrollment.repository.ts:9-129` - Enrollment data access
- `course.repository.ts:9-110` - Course data access
- `student.repository.ts:7-85` - Student data access

**Pattern Characteristics:**
- Exported as singleton objects (not classes)
- Abstracts DynamoDB operations (PutCommand, GetCommand, QueryCommand, UpdateCommand)
- Handles key mapping (PK, SK, GSI1PK, GSI1SK, entityType)
- Domain object transformation (strips DynamoDB keys on read, adds them on write)

**Usage Consistency**: 100% consistent across all features
- All repositories share identical structure
- Use shared `docClient` from `lib/dynamodb.ts:6`
- Follow single-table design with entity type prefixes

**Pattern Strength**: Proven pattern, no changes needed

---

### 3. Service Layer Pattern (Architectural)

**Location**: `backend/src/features/*/service.ts` files

**Current Implementations:**
- `enrollment.service.ts:9-91` - Enrollment business logic
- `course.service.ts:7-32` - Course business logic
- `student.service.ts:7-22` - Student business logic

**Pattern Characteristics:**
- Class-based with instance methods
- Exported as singleton instances (e.g., `enrollmentService` at line 91)
- Orchestrates cross-repository operations
- Handles idempotency checks (e.g., `enrollment.service.ts:14-27`)
- Delegates to strategies for type-specific logic

**Usage Consistency**: Consistent across all features
- All services follow class + singleton export pattern
- Clear separation: routes -> services -> repositories/strategies

**Pattern Strength**: Clean architecture, extensible for Stripe payments

---

### 4. Event-Driven Architecture with SNS Fanout (Architectural)

**Location**: `backend/src/lambdas/` and `backend/template.yaml`

**Current Implementation:**
- **Producer**: `post-confirmation.ts:26-108` - Publishes to SNS on user sign-up
- **Topic**: `template.yaml:178-188` - `StudentOnboardingTopic`
- **Consumer**: `student-onboarding.ts:33-120` - Creates student record in DynamoDB
- **DLQ**: `template.yaml:191-200` - Dead Letter Queue for failed messages

**Pattern Characteristics:**
- Non-blocking event publishing (errors don't block main flow)
- SNS enables multiple consumers for same event
- Idempotent processing via DynamoDB conditional expressions
- Dead Letter Queue for failed message investigation

**Usage Consistency**: Proven for async operations
- Successfully handles user onboarding flow
- Comprehensive error handling and metrics

**Applicability to Stripe**: Webhook processing could follow similar async pattern

---

### 5. Server Actions Pattern (Next.js/Frontend)

**Location**: `frontend/app/actions/enrollments.ts`

**Current Implementation:**
- Server actions with `'use server'` directive (line 1)
- Authentication via `getAuthToken()` from auth actions (lines 48-56)
- API calls with Authorization header (line 67)
- Returns serializable result types (lines 31-36)

**Pattern Characteristics:**
- Server-side execution, tokens never exposed to client
- Consistent error handling and logging
- Result types with discriminated unions (`success: boolean`)

**Usage Consistency**: Used for all backend API calls
- `enrollments.ts` - Enrollment operations
- `courses.ts` - Course fetching
- `students.ts` - Student operations
- `auth.ts` - Authentication

**Pattern Strength**: Secure and type-safe, ideal for Stripe operations

---

### 6. Secrets Management Pattern (AWS Secrets Manager)

**Location**: `backend/template.yaml:18-20, 87-88`

**Current Implementation:**
- **Parameter Definition**: Lines 18-20 - `GoogleOAuthSecretArn` parameter
- **Secret Resolution**: Lines 87-88 - CloudFormation `{{resolve:secretsmanager:...}}` syntax
- **Existing Secret**: `arn:aws:secretsmanager:us-east-1:853219709625:secret:learnermax/google-oauth-15o5Q2`
- **Structure**: JSON with multiple keys (`client_id`, `client_secret`)

**Usage Consistency**: Established pattern for third-party credentials

**Direct Application to Stripe**: Follow exact same pattern for Stripe keys

---

### 7. Scripts Pattern (Bash Automation)

**Location**: `backend/scripts/` and `scripts/`

**Current Implementations:**
- `seed-test-courses.sh` - DynamoDB data seeding
- `deploy-preview-backend.sh` - SAM deployment
- `start-sam-logs.sh` - Background log monitoring

**Pattern Characteristics:**
- Consistent header with `#!/bin/bash` and `set -e`
- Dry-run support (`--dry-run` flag)
- Environment variable configuration with defaults
- Color-coded output (RED/GREEN/YELLOW)
- Prerequisite validation (AWS CLI, table existence)
- Path resolution using `SCRIPT_DIR` pattern

**Usage Consistency**: All scripts follow identical conventions

**Direct Application to Stripe**: Two scripts needed following these patterns

---

## Pattern Analysis for Spec Requirements

### Requirement 1: Paid Course Enrollment via Stripe

**Spec Quote**: "When on Dashboard and I click on a CourseCard enroll now button that is pricingModel 'paid', I expect a Stripe powered payment flow to begin."

**Existing Pattern Match**: Strategy Pattern at `enrollment.service.ts:44-62`

**Current Code**:
```typescript
if (course.pricingModel === 'free') {
  const strategy = new FreeEnrollmentStrategy();
  return await strategy.enroll(userId, courseId);
}
throw new Error(`Unsupported pricing model: ${course.pricingModel}`);
```

**Fit Assessment**: Perfect match - intentionally designed for this extension

**Implementation Approach**:
```typescript
if (course.pricingModel === 'free') {
  const strategy = new FreeEnrollmentStrategy();
  return await strategy.enroll(userId, courseId);
} else if (course.pricingModel === 'paid') {
  const strategy = new PaidEnrollmentStrategy();
  return await strategy.enroll(userId, courseId);
}
throw new Error(`Unsupported pricing model: ${course.pricingModel}`);
```

**Type System Already Supports Paid Enrollment** (`enrollment.types.ts:1-17`):
- Line 4: `enrollmentType: 'free' | 'paid' | 'bundle'`
- Line 6: `paymentStatus: 'free' | 'pending' | 'completed'`
- Line 7: `stripeSessionId?: string`
- Line 15: `checkoutUrl?: string` in `EnrollmentResult`
- Line 16: `status: 'active' | 'pending'`

---

### Requirement 2: Stripe Embedded Form Integration

**Spec Quote**: "I want to use stripes embeded form for the stripe integration"

**Existing Pattern Match**: Client Component Pattern at `frontend/components/dashboard/CourseCard.tsx`

**Current Flow**:
1. User clicks "Enroll Now" button (line 141)
2. `handleEnrollClick` executes (lines 25-38)
3. Calls parent `onEnroll(course.courseId)` callback (line 32)
4. Dashboard calls server action `enrollInCourse()` (DashboardContent.tsx:88)

**Fit Assessment**: Excellent foundation - needs conditional logic for paid courses

**Implementation Approach**:
- Check `course.pricingModel` in click handler
- For paid courses: Open modal/overlay with Stripe embedded form
- For free courses: Keep existing direct enrollment flow
- Frontend already uses Radix UI primitives (Dialog available)

**Pattern Reference**: Similar to `GoogleSignInButton.tsx` (client component calling server action)

---

### Requirement 3: Stripe Webhooks for Payment Confirmation

**Spec Quote**: "Webhooks implmented for Stripe to call so we can confirm on our side the success of the payment"

**Existing Pattern Match**: Event-Driven Architecture (SNS/Lambda pattern)

**Current Implementation**: `student-onboarding.ts:33-120`
- Async message processing from SNS
- Idempotency via DynamoDB conditional expressions (line 70)
- Error handling with DLQ for failed attempts
- Metrics for success/failure tracking

**Fit Assessment**: Strong pattern, but webhook needs different entry point

**Webhook-Specific Requirements**:
- **No authentication** - webhooks bypass API Gateway auth
- **Signature verification** - Use Stripe SDK to verify webhook signature
- **Raw body parsing** - Need `express.raw()` instead of `express.json()`
- **Immediate 200 response** - Acknowledge receipt, process async if needed

**Implementation Approach**:
```typescript
// New route in enrollment.routes.ts
router.post('/webhooks/stripe',
  express.raw({ type: 'application/json' }),  // Raw body for signature
  async (req, res) => {
    // Verify Stripe signature
    // Update enrollment paymentStatus to 'completed'
    // Return 200 immediately
  }
);
```

**Pattern Reference**: `enrollment.repository.ts` has `get()` method for fetching enrollment by userId/courseId, but needs `update()` method

**Update Method Pattern**: Follow `student.repository.ts:62-85` (dynamic UpdateExpression builder)

---

### Requirement 4: Script to Add Stripe Keys to Secrets Manager

**Spec Quote**: "Local Script that adds STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to my secret manager"

**Existing Pattern Match**: Secrets Management Pattern + Scripts Pattern

**Pattern Reference**:
- Secret structure: `template.yaml:87-88` (JSON with multiple keys)
- Script conventions: `backend/scripts/seed-test-courses.sh:1-209`
- Existing secret: `learnermax/google-oauth`

**Implementation Approach**:
- Script: `backend/scripts/add-stripe-secrets.sh`
- Secret name: `learnermax/stripe-keys`
- JSON structure: `{ "STRIPE_SECRET_KEY": "sk_test_...", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "pk_test_..." }`
- Read from `.env.local` at project root (currently has keys at lines 15-16)
- Support `--dry-run` flag
- Support `--environment` flag (preview/prod)

---

### Requirement 5: Script to Create Stripe Products for Paid Courses

**Spec Quote**: "I want you to create a product for each paid course I have in my dynamodb. You should create a stripe script for me to execute that creates these products."

**Existing Pattern Match**: Data Seeding Pattern + Stripe CLI

**Pattern Reference**: `backend/scripts/seed-test-courses.sh:54-125` (function-based item creation)

**Implementation Approach**:
- Script: `backend/scripts/sync-stripe-products.sh`
- Query DynamoDB for courses where `pricingModel === 'paid'`
- Use Stripe CLI: `/home/linuxbrew/.linuxbrew/bin/stripe` (version 1.28.0)
- Create Stripe product for each paid course
- Create Stripe price for each product
- Optionally store Stripe product ID back to DynamoDB (extend Course type)
- Support `--dry-run` flag
- Idempotent: Check if product already exists before creating

**Current Paid Courses** (from `seed-test-courses.sh`):
- `TEST-COURSE-003` - Full-Stack Development Bootcamp ($99.99)
- `TEST-COURSE-005` - AWS Cloud Mastery ($149.99)

---

## Recommendations

### ✅ Use Existing Patterns

#### 1. **Strategy Pattern** for Paid Enrollment
- **Location**: `backend/src/features/enrollment/strategies/paid-enrollment.strategy.ts` (new file)
- **Interface**: Use existing `EnrollmentStrategy` interface
- **Selection**: Extend logic at `enrollment.service.ts:44-62`
- **Justification**: Pattern explicitly designed for this use case
- **Example Implementation**:
  ```typescript
  export class PaidEnrollmentStrategy implements EnrollmentStrategy {
    async enroll(userId: string, courseId: string): Promise<EnrollmentResult> {
      // 1. Create Stripe Checkout Session
      // 2. Create enrollment with paymentStatus: 'pending'
      // 3. Return EnrollmentResult with checkoutUrl and status: 'pending'
    }
  }
  ```

#### 2. **Repository Pattern** for Enrollment Updates
- **Location**: Extend `backend/src/features/enrollment/enrollment.repository.ts`
- **Method**: Add `update()` method following `student.repository.ts:62-85` pattern
- **Usage**: Webhook handler will call `enrollmentRepository.update(userId, courseId, { paymentStatus: 'completed' })`
- **Justification**: Consistent with existing data access patterns

#### 3. **Server Actions Pattern** for Frontend Payment Flow
- **Location**: `frontend/app/actions/enrollments.ts` (extend existing file)
- **New Action**: `createPaymentSession(courseId: string)` to initiate Stripe checkout
- **Returns**: `{ success: boolean, checkoutUrl?: string, error?: string }`
- **Justification**: Keeps tokens server-side, maintains existing architecture

#### 4. **Secrets Manager Pattern** for Stripe Keys
- **CloudFormation Parameter**: Add `StripeSecretArn` to `backend/template.yaml:18-20`
- **Secret Resolution**: Add environment variables using `{{resolve:secretsmanager:...}}`
- **Secret Name**: `learnermax/stripe-keys`
- **JSON Keys**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Justification**: Proven pattern for Google OAuth, identical use case

#### 5. **Scripts Pattern** for Stripe Setup
- **Script 1**: `backend/scripts/add-stripe-secrets.sh`
  - Follows conventions from `seed-test-courses.sh`
  - Creates secret in AWS Secrets Manager
  - Reads from `.env.local`
- **Script 2**: `backend/scripts/sync-stripe-products.sh`
  - Follows conventions from `seed-test-courses.sh`
  - Queries DynamoDB for paid courses
  - Uses Stripe CLI to create products
- **Justification**: Established conventions ensure consistency

---

### ⚠️ Pattern Adaptations Needed

#### 1. **Webhook Route Pattern** (Adaptation of Express Route Pattern)
- **Difference from Standard Routes**: No authentication, signature verification instead
- **Location**: `backend/src/features/enrollment/enrollment.routes.ts` (extend existing)
- **Implementation**:
  ```typescript
  router.post('/webhooks/stripe',
    express.raw({ type: 'application/json' }),  // NOT express.json()
    async (req, res) => {
      // Verify signature with Stripe SDK
      // Process event
      // Return 200 immediately
    }
  );
  ```
- **Justification**: Stripe webhooks have different security model than API Gateway auth

#### 2. **Client Component with Modal** (Adaptation of CourseCard Pattern)
- **Current State**: Direct server action call on button click
- **Needed Adaptation**: Conditional flow based on `course.pricingModel`
- **Implementation**:
  ```typescript
  const handleEnrollClick = async () => {
    if (course.pricingModel === 'free') {
      await onEnroll(course.courseId);  // Existing flow
    } else if (course.pricingModel === 'paid') {
      setShowPaymentModal(true);  // New modal flow
    }
  };
  ```
- **Justification**: Maintains existing free enrollment flow, adds paid flow conditionally

---

### ❌ No New Patterns Needed

The following patterns were considered but are **NOT recommended** because existing patterns suffice:

#### 1. **Factory Pattern for Strategy Selection**
- **Reason**: Service layer directly instantiates strategies (only 2 types)
- **Trade-off**: Factory adds complexity without benefit for small number of strategies
- **Current Approach Sufficient**: Simple if/else at `enrollment.service.ts:44-62`

#### 2. **Observer Pattern for Payment Events**
- **Reason**: SNS/Lambda already provides event-driven architecture at infrastructure level
- **Trade-off**: Application-level observers add complexity
- **Current Approach Sufficient**: Webhook directly updates enrollment record

#### 3. **Command Pattern for Webhook Processing**
- **Reason**: Single webhook type (payment success) doesn't warrant command abstraction
- **Trade-off**: Over-engineering for current requirements
- **Current Approach Sufficient**: Direct enrollment update in webhook handler

#### 4. **DTO/Mapper Pattern for Data Transformation**
- **Reason**: Inline transformation with spread/destructuring works well
- **Trade-off**: Additional mapper classes increase boilerplate
- **Current Approach Sufficient**: Repository handles transformation inline

---

## Implementation Checklist

### Backend

- [ ] **Script 1**: `backend/scripts/add-stripe-secrets.sh`
  - Create AWS Secrets Manager secret `learnermax/stripe-keys`
  - Follow pattern from `seed-test-courses.sh` (dry-run, colors, validation)

- [ ] **Script 2**: `backend/scripts/sync-stripe-products.sh`
  - Query paid courses from DynamoDB
  - Create Stripe products via Stripe CLI
  - Follow pattern from `seed-test-courses.sh`

- [ ] **CloudFormation**: Update `backend/template.yaml`
  - Add `StripeSecretArn` parameter (like `GoogleOAuthSecretArn` at lines 18-20)
  - Add environment variables for Lambda (lines 328-336)
  - Resolve secrets using `{{resolve:secretsmanager:...}}` (like lines 87-88)

- [ ] **Stripe Client**: Create `backend/src/lib/stripe.ts`
  - Initialize Stripe SDK with secret key
  - Follow pattern from `lib/dynamodb.ts` (singleton export)

- [ ] **Strategy**: Create `backend/src/features/enrollment/strategies/paid-enrollment.strategy.ts`
  - Implement `EnrollmentStrategy` interface
  - Create Stripe Checkout Session
  - Create enrollment with `paymentStatus: 'pending'`
  - Return `EnrollmentResult` with `checkoutUrl` and `status: 'pending'`

- [ ] **Repository**: Extend `backend/src/features/enrollment/enrollment.repository.ts`
  - Add `update(userId, courseId, updates)` method
  - Follow pattern from `student.repository.ts:62-85`

- [ ] **Service**: Update `backend/src/features/enrollment/enrollment.service.ts:44-62`
  - Add `else if (course.pricingModel === 'paid')` branch
  - Instantiate `PaidEnrollmentStrategy`

- [ ] **Webhook Route**: Extend `backend/src/features/enrollment/enrollment.routes.ts`
  - Add POST `/webhooks/stripe` endpoint
  - Use `express.raw()` middleware for signature verification
  - Verify Stripe signature
  - Update enrollment `paymentStatus` to `'completed'`
  - Return 200 immediately

### Frontend

- [ ] **Server Action**: Extend `frontend/app/actions/enrollments.ts`
  - Add `createPaymentSession(courseId)` function
  - Calls backend to create Stripe Checkout Session
  - Returns `checkoutUrl`

- [ ] **CourseCard**: Update `frontend/components/dashboard/CourseCard.tsx:25-38`
  - Check `course.pricingModel` in `handleEnrollClick`
  - For free: existing flow
  - For paid: open payment modal or redirect to Stripe Checkout

- [ ] **Payment Modal**: Create `frontend/components/enrollment/StripePaymentModal.tsx` (optional)
  - Client component with Stripe Elements
  - Or simply redirect to Stripe Checkout URL (simpler)

---

## Summary

The LearnerMax codebase has excellent architectural patterns in place for the Stripe enrollment feature:

1. **Strategy Pattern** is explicitly designed for enrollment type extension
2. **Repository Pattern** is consistent and proven across all features
3. **Server Actions Pattern** provides secure API communication layer
4. **Secrets Management Pattern** already handles Google OAuth, identical for Stripe
5. **Scripts Pattern** has clear conventions for automation tasks

**Key Principle**: Extend existing patterns rather than introduce new ones. The architecture is well-designed and anticipates this feature (note the `stripeSessionId` field already exists in `enrollment.types.ts:7`).

**Confidence Level**: Very High - All patterns are established, tested, and documented.
