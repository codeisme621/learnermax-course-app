# Stripe Enrollment Implementation Plan

## Overview

This plan implements paid course enrollment using Stripe as the payment provider. Students will be able to enroll in paid courses using Stripe's embedded checkout form, with payment confirmation handled via webhooks. The implementation follows the existing strategy pattern for enrollment and establishes a payment provider abstraction for future extensibility (PayPal, etc.).

## Current State Analysis

### What Exists
- **Strategy Pattern Infrastructure**: Enrollment service already selects strategies based on `course.pricingModel` (currently only supports 'free')
- **Database Schema**: Enrollment type already has `enrollmentType: 'paid'`, `paymentStatus: 'pending' | 'completed'`, and `stripeSessionId`
- **Stripe Data**: Two paid courses (TEST-COURSE-005 and TEST-COURSE-003) have `stripeProductId` and `stripePriceId` in DynamoDB
- **Stripe Secrets**: AWS Secrets Manager has `learnermax/stripe` secret with `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`
- **Authentication**: API Gateway uses Cognito authorizer by default; public routes simply don't check `userId`

### What's Missing
- **Type Definitions**: Stripe fields not in TypeScript interfaces (Course, Student, Enrollment)
- **Payment Provider**: No Stripe integration or payment provider abstraction exists
- **Paid Enrollment Strategy**: No implementation for paid course enrollment
- **Webhook Handler**: No endpoint to receive and process Stripe webhook events
- **SQS Fallback**: No queue infrastructure for failed webhook processing
- **Frontend Logic**: No conditional enrollment flow based on pricing model
- **Stripe UI**: No embedded checkout page or return page after payment

### Key Constraints
- **Embedded Checkout**: Using Stripe's embedded form (not hosted) - payment form stays on our site
- **Authentication**: Webhooks cannot use Cognito authorization - need security override in API Gateway
- **Idempotency**: Enrollment service already handles duplicate enrollments; webhook must be idempotent too
- **No Refunds**: Out of scope, but we'll capture `stripePaymentIntentId` for future use

## Desired End State

### Success Scenario
1. Student clicks "Enroll Now" on paid course card → redirected to checkout page
2. Checkout page displays Stripe embedded form with course price
3. Student enters payment details and submits
4. Stripe processes payment and redirects to return page
5. Webhook receives `checkout.session.completed` event and creates enrollment record
6. Return page verifies enrollment exists and shows success message
7. Student returns to dashboard and sees "Enrolled" badge on course

### Verification Criteria
- ✅ Can enroll in free courses (existing behavior unchanged)
- ✅ Clicking "Enroll Now" on paid course redirects to checkout page
- ✅ Checkout page renders Stripe embedded form with correct price
- ✅ Test payment succeeds and webhook creates enrollment with `enrollmentType: 'paid'` and `paymentStatus: 'completed'`
- ✅ Student record has `stripeCustomerId` after first payment
- ✅ Enrollment record has `stripePaymentIntentId` and `stripeSessionId`
- ✅ Return page shows success and redirects to dashboard
- ✅ Dashboard shows "Enrolled" badge on paid course
- ✅ Failed webhook processing falls back to SQS queue
- ✅ DLQ alarm triggers when messages reach dead letter queue

## What We're NOT Doing

Per the specification, the following are explicitly out of scope:
- Modifications to `/course/[slug]` page (keeping placeholder data)
- Landing page modifications (keeping in place)
- Refund handling (not implementing refund logic)
- Subscription payments (only one-time payments)

## Implementation Approach

We'll implement this feature in 7 phases, with automated validation and manual testing after each phase:

1. **Type Definitions & Schema Updates** - Add Stripe fields to TypeScript types
2. **Payment Provider Infrastructure** - Create payment provider abstraction and Stripe implementation
3. **Paid Enrollment Strategy** - Implement strategy for paid course enrollment
4. **Webhook Handler with SQS Fallback** - Handle payment confirmation with resilient error handling
5. **Frontend Conditional Enrollment & Checkout** - Detect pricing model and show Stripe form
6. **Return Page & Success Flow** - Handle post-payment redirect and verification
7. **End-to-End Testing** - Manual testing of complete flow with preview deployment

Each phase follows the pattern:
- **a) Development** - Write code changes
- **b) Validation** - Run automated tests
- **c) Manual Review** - Verify, commit, and optionally deploy to preview

---

## Phase 1.a: Type Definitions & Schema Updates

### Overview
Add Stripe-related fields to TypeScript type definitions across backend and frontend. These fields already exist in the database for some records but aren't reflected in the types.

### Changes Required

#### 1.1 Backend Course Type
**File**: `backend/src/features/courses/course.types.ts`
**Changes**: Add Stripe product and price fields to Course interface

```typescript
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

**Rationale**: These fields exist in DynamoDB for paid courses (TEST-COURSE-005 and TEST-COURSE-003) but aren't in the TypeScript interface.

#### 1.2 Backend Student Type
**File**: `backend/src/features/students/student.types.ts`
**Changes**: Add Stripe customer ID field

```typescript
export interface Student {
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

**Rationale**: Stripe customer ID is created on first payment and reused for future purchases by the same student.

#### 1.3 Backend Enrollment Type
**File**: `backend/src/features/enrollment/enrollment.types.ts`
**Changes**: Add payment intent field and client secret to result

```typescript
export interface Enrollment {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid' | 'bundle';
  enrolledAt: string;
  paymentStatus: 'free' | 'pending' | 'completed';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;  // ADD THIS - needed for future refunds
  progress: number;
  completed: boolean;
  completedAt?: string;
}

export interface EnrollmentResult {
  enrollment?: Enrollment;
  clientSecret?: string;  // CHANGE: was checkoutUrl, now clientSecret for embedded form
  status: 'active' | 'pending';
}
```

**Rationale**:
- `stripePaymentIntentId` is required for issuing refunds (future feature)
- `clientSecret` replaces `checkoutUrl` because embedded checkout uses client secrets, not redirect URLs

#### 1.4 Frontend Course Type
**File**: `frontend/app/actions/courses.ts`
**Changes**: Add Stripe fields to match backend

```typescript
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

---

## Phase 1.b: Validation Tests

### Automated Tests
Run these commands from the backend directory:

```bash
cd backend
pnpm run test          # Unit tests should pass
pnpm run lint          # Linting should pass
pnpm run typecheck     # TypeScript compilation should pass
```

### Expected Results
- ✅ All existing tests pass (type changes are non-breaking)
- ✅ No TypeScript errors
- ✅ No linting errors

---

## Phase 1.c: Manual Review and Optional Deployment

### Manual Verification Steps
1. Review type changes in all 4 files
2. Verify that optional fields (`?`) are used appropriately
3. Confirm that `checkoutUrl` → `clientSecret` change makes sense for embedded checkout

### Commit Decision
**STOP** and ask user:
- Should we commit these type definition changes?
- Should we deploy to preview environment?

### Success Criteria
- ✅ Development Completed: Type definitions updated in 4 files
- ✅ All Validation Tests Passing: Unit tests, lint, typecheck all pass
- ✅ Stopped for Manual Review: User reviews, commits, and/or deploys to preview

---

## Phase 2.a: Payment Provider Infrastructure

### Overview
Create a payment provider abstraction with Stripe implementation. This follows the DynamoDB client pattern in `backend/src/lib/` and supports future payment providers (PayPal, etc.).

### Changes Required

#### 2.1 Payment Provider Interface
**File**: `backend/src/lib/payment/payment-provider.interface.ts` (NEW FILE)
**Changes**: Define interface for payment providers

```typescript
export interface CheckoutSessionParams {
  userId: string;
  courseId: string;
  courseName: string;
  priceId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  existingCustomerId?: string;
  returnUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  clientSecret: string;
  customerId: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export interface PaymentProvider {
  /**
   * Create a checkout session for embedded form
   */
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(rawBody: string, signature: string): WebhookEvent;

  /**
   * Retrieve checkout session details
   */
  getCheckoutSession(sessionId: string): Promise<any>;
}
```

#### 2.2 Stripe Provider Implementation
**File**: `backend/src/lib/payment/stripe-provider.ts` (NEW FILE)
**Changes**: Implement Stripe integration

```typescript
import Stripe from 'stripe';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type {
  PaymentProvider,
  CheckoutSessionParams,
  CheckoutSessionResult,
  WebhookEvent
} from './payment-provider.interface.js';
import { createLogger } from '../logger.js';

const logger = createLogger('StripeProvider');

export class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe | null = null;
  private webhookSecret: string | null = null;

  /**
   * Initialize Stripe SDK with secrets from AWS Secrets Manager
   */
  private async initialize(): Promise<void> {
    if (this.stripe && this.webhookSecret) {
      return; // Already initialized
    }

    logger.info('[initialize] Fetching Stripe secrets from AWS Secrets Manager');

    const secretsManager = new SecretsManagerClient({ region: 'us-east-1' });
    const command = new GetSecretValueCommand({ SecretId: 'learnermax/stripe' });
    const secretValue = await secretsManager.send(command);

    if (!secretValue.SecretString) {
      throw new Error('Stripe secrets not found');
    }

    const secrets = JSON.parse(secretValue.SecretString);
    const secretKey = secrets.STRIPE_SECRET_KEY;
    this.webhookSecret = secrets.STRIPE_WEBHOOK_SECRET;

    if (!secretKey || !this.webhookSecret) {
      throw new Error('Stripe secret key or webhook secret missing');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia', // Use latest stable API version
    });

    logger.info('[initialize] Stripe SDK initialized successfully');
  }

  /**
   * Create an embedded checkout session
   */
  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    await this.initialize();

    logger.info('[createCheckoutSession] Creating session', {
      userId: params.userId,
      courseId: params.courseId,
      priceId: params.priceId,
      amount: params.amount,
    });

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      ui_mode: 'embedded', // IMPORTANT: Embedded form, not hosted
      mode: 'payment',
      customer: params.existingCustomerId,
      customer_email: params.existingCustomerId ? undefined : params.customerEmail,
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      return_url: params.returnUrl,
      metadata: {
        userId: params.userId,
        courseId: params.courseId,
        courseName: params.courseName,
      },
    };

    const session = await this.stripe!.checkout.sessions.create(sessionParams);

    logger.info('[createCheckoutSession] Session created successfully', {
      sessionId: session.id,
      customerId: session.customer as string,
    });

    return {
      sessionId: session.id,
      clientSecret: session.client_secret!,
      customerId: session.customer as string,
    };
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(rawBody: string, signature: string): WebhookEvent {
    if (!this.stripe || !this.webhookSecret) {
      throw new Error('Stripe not initialized');
    }

    logger.info('[verifyWebhookSignature] Verifying webhook signature');

    try {
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );

      logger.info('[verifyWebhookSignature] Signature verified', { eventType: event.type });

      return event as WebhookEvent;
    } catch (error) {
      logger.error('[verifyWebhookSignature] Signature verification failed', { error });
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Retrieve checkout session details
   */
  async getCheckoutSession(sessionId: string): Promise<any> {
    await this.initialize();

    logger.info('[getCheckoutSession] Retrieving session', { sessionId });

    const session = await this.stripe!.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });

    logger.info('[getCheckoutSession] Session retrieved', {
      sessionId: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
    });

    return session;
  }
}

// Singleton instance
export const stripeProvider = new StripePaymentProvider();
```

#### 2.3 Install Stripe SDK
**File**: `backend/package.json`
**Changes**: Add Stripe dependency

```bash
cd backend
pnpm add stripe @aws-sdk/client-secrets-manager
```

#### 2.4 Add Webhook Secret to AWS Secrets Manager
**File**: `scripts/update-stripe-webhook-secret.sh` (NEW FILE)
**Changes**: Script to update secret with webhook signing secret

```bash
#!/bin/bash

# This script updates the learnermax/stripe secret to include STRIPE_WEBHOOK_SECRET
# Run after creating webhook endpoint in Stripe dashboard

set -e

SECRET_NAME="learnermax/stripe"
AWS_REGION="us-east-1"

echo "Updating $SECRET_NAME with webhook secret..."

# Prompt for webhook secret
read -p "Enter Stripe webhook signing secret (whsec_...): " WEBHOOK_SECRET

if [[ ! $WEBHOOK_SECRET =~ ^whsec_ ]]; then
  echo "Error: Webhook secret should start with 'whsec_'"
  exit 1
fi

# Get existing secret value
EXISTING_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$AWS_REGION" \
  --query 'SecretString' \
  --output text)

# Parse existing secret and add webhook secret
NEW_SECRET=$(echo "$EXISTING_SECRET" | jq --arg ws "$WEBHOOK_SECRET" '. + {STRIPE_WEBHOOK_SECRET: $ws}')

# Update secret
aws secretsmanager put-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$AWS_REGION" \
  --secret-string "$NEW_SECRET"

echo "✓ Secret updated successfully!"
echo "Secret now contains:"
echo "$NEW_SECRET" | jq 'keys'
```

#### 2.5 Unit Tests for Stripe Provider
**File**: `backend/src/lib/payment/__tests__/stripe-provider.test.ts` (NEW FILE)
**Changes**: Add unit tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StripePaymentProvider } from '../stripe-provider.js';

// Mock AWS Secrets Manager
vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  GetSecretValueCommand: vi.fn(),
}));

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => ({
      checkout: {
        sessions: {
          create: vi.fn(),
          retrieve: vi.fn(),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    })),
  };
});

describe('StripePaymentProvider', () => {
  let provider: StripePaymentProvider;

  beforeEach(() => {
    provider = new StripePaymentProvider();
  });

  it('should create checkout session with embedded mode', async () => {
    // Test implementation will verify ui_mode: 'embedded'
    expect(provider).toBeDefined();
  });

  it('should verify webhook signature', () => {
    // Test webhook signature verification
    expect(provider.verifyWebhookSignature).toBeDefined();
  });

  it('should retrieve checkout session', async () => {
    // Test session retrieval
    expect(provider.getCheckoutSession).toBeDefined();
  });
});
```

---

## Phase 2.b: Validation Tests

### Automated Tests
```bash
cd backend
pnpm run test          # Unit tests including new Stripe provider tests
pnpm run lint          # Linting
pnpm run typecheck     # TypeScript compilation
```

### Expected Results
- ✅ All tests pass including new Stripe provider tests
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Stripe SDK installed successfully

---

## Phase 2.c: Manual Review and Optional Deployment

### Manual Verification Steps
1. Review payment provider interface for extensibility
2. Verify Stripe provider implementation uses embedded mode (`ui_mode: 'embedded'`)
3. Confirm secrets are fetched from AWS Secrets Manager (not environment variables)
4. Check that singleton pattern is used for provider instance

### Commit Decision
**STOP** and ask user:
- Should we commit the payment provider infrastructure?
- Should we deploy to preview environment?
- Do we need to add STRIPE_WEBHOOK_SECRET to AWS Secrets Manager now?

### Success Criteria
- ✅ Development Completed: Payment provider interface and Stripe implementation created
- ✅ All Validation Tests Passing: Unit tests, lint, typecheck all pass
- ✅ Stopped for Manual Review: User reviews, commits, and/or deploys to preview

---

## Phase 3.a: Paid Enrollment Strategy

### Overview
Implement `PaidEnrollmentStrategy` that creates a Stripe checkout session instead of immediately enrolling the user. Update enrollment service to select this strategy for paid courses.

### Changes Required

#### 3.1 Paid Enrollment Strategy
**File**: `backend/src/features/enrollment/strategies/paid-enrollment.strategy.ts` (NEW FILE)
**Changes**: Create paid enrollment strategy

```typescript
import type { EnrollmentStrategy } from './enrollment-strategy.interface.js';
import type { EnrollmentResult } from '../enrollment.types.js';
import { stripeProvider } from '../../../lib/payment/stripe-provider.js';
import { courseRepository } from '../../courses/course.repository.js';
import { studentRepository } from '../../students/student.repository.js';
import { createLogger } from '../../../lib/logger.js';

const logger = createLogger('PaidEnrollmentStrategy');

export class PaidEnrollmentStrategy implements EnrollmentStrategy {
  async enroll(userId: string, courseId: string): Promise<EnrollmentResult> {
    logger.info('[enroll] Starting paid enrollment strategy', { userId, courseId });

    // Fetch course to get Stripe price ID
    const course = await courseRepository.get(courseId);
    if (!course) {
      throw new Error(`Course not found: ${courseId}`);
    }

    if (!course.stripePriceId) {
      throw new Error(`Course ${courseId} does not have a Stripe price ID configured`);
    }

    if (!course.price) {
      throw new Error(`Course ${courseId} does not have a price configured`);
    }

    logger.info('[enroll] Course details fetched', {
      courseId,
      courseName: course.name,
      stripePriceId: course.stripePriceId,
      price: course.price,
    });

    // Fetch student to get email and check for existing Stripe customer
    const student = await studentRepository.get(userId);
    if (!student) {
      throw new Error(`Student not found: ${userId}`);
    }

    logger.info('[enroll] Student details fetched', {
      userId,
      email: student.email,
      hasStripeCustomerId: !!student.stripeCustomerId,
    });

    // Create Stripe checkout session
    const returnUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/enrollment/return?session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripeProvider.createCheckoutSession({
      userId,
      courseId,
      courseName: course.name,
      priceId: course.stripePriceId,
      amount: course.price * 100, // Convert to cents
      currency: 'usd',
      customerEmail: student.email,
      existingCustomerId: student.stripeCustomerId,
      returnUrl,
    });

    logger.info('[enroll] Checkout session created', {
      userId,
      courseId,
      sessionId: session.sessionId,
      customerId: session.customerId,
    });

    // Update student with Stripe customer ID if this is their first payment
    if (!student.stripeCustomerId && session.customerId) {
      logger.info('[enroll] Updating student with Stripe customer ID', {
        userId,
        customerId: session.customerId,
      });

      await studentRepository.update(userId, {
        stripeCustomerId: session.customerId,
        updatedAt: new Date().toISOString(),
      });
    }

    // Return pending status with client secret for embedded checkout
    return {
      clientSecret: session.clientSecret,
      status: 'pending',
    };
  }
}
```

#### 3.2 Update Enrollment Service
**File**: `backend/src/features/enrollment/enrollment.service.ts`
**Changes**: Add paid strategy selection (lines 43-55)

```typescript
import { enrollmentRepository } from './enrollment.repository.js';
import { courseRepository } from '../courses/course.repository.js';
import { FreeEnrollmentStrategy } from './strategies/free-enrollment.strategy.js';
import { PaidEnrollmentStrategy } from './strategies/paid-enrollment.strategy.js'; // ADD THIS
import { createLogger } from '../../lib/logger.js';
import type { EnrollmentResult } from './enrollment.types.js';

const logger = createLogger('EnrollmentService');

export class EnrollmentService {
  async enrollUser(userId: string, courseId: string): Promise<EnrollmentResult> {
    logger.info('[enrollUser] Starting enrollment process', { userId, courseId });

    // Idempotency check
    logger.info('[enrollUser] Checking for existing enrollment', { userId, courseId });
    const existing = await enrollmentRepository.get(userId, courseId);
    if (existing) {
      logger.info('[enrollUser] User already enrolled - returning existing enrollment', {
        userId,
        courseId,
        enrollmentType: existing.enrollmentType,
        paymentStatus: existing.paymentStatus
      });
      return {
        enrollment: existing,
        status: 'active'
      };
    }

    logger.info('[enrollUser] No existing enrollment found - fetching course', { userId, courseId });
    const course = await courseRepository.get(courseId);
    if (!course) {
      logger.error('[enrollUser] Course not found', { userId, courseId });
      throw new Error(`Course not found: ${courseId}`);
    }

    logger.info('[enrollUser] Course found', {
      userId,
      courseId,
      courseName: course.name,
      pricingModel: course.pricingModel
    });

    // Strategy selection (extensible for paid/bundle)
    if (course.pricingModel === 'free') {
      logger.info('[enrollUser] Using free enrollment strategy', { userId, courseId });
      const strategy = new FreeEnrollmentStrategy();
      const result = await strategy.enroll(userId, courseId);
      logger.info('[enrollUser] Enrollment completed successfully', {
        userId,
        courseId,
        status: result.status,
        enrollmentType: result.enrollment?.enrollmentType
      });
      return result;
    }

    // ADD THIS BLOCK
    if (course.pricingModel === 'paid') {
      logger.info('[enrollUser] Using paid enrollment strategy', { userId, courseId });
      const strategy = new PaidEnrollmentStrategy();
      const result = await strategy.enroll(userId, courseId);
      logger.info('[enrollUser] Checkout session created', {
        userId,
        courseId,
        status: result.status,
      });
      return result;
    }

    logger.error('[enrollUser] Unsupported pricing model', {
      userId,
      courseId,
      pricingModel: course.pricingModel
    });
    throw new Error(`Unsupported pricing model: ${course.pricingModel}`);
  }

  // ... rest of the methods remain unchanged
}

export const enrollmentService = new EnrollmentService();
```

#### 3.3 Add Student Repository Update Method
**File**: `backend/src/features/students/student.repository.ts`
**Changes**: Add update method if it doesn't exist

```typescript
import { dynamodb } from '../../lib/dynamodb.js';
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Student } from './student.types.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('StudentRepository');

export const studentRepository = {
  // ... existing create and get methods ...

  /**
   * Update student fields
   */
  async update(userId: string, updates: Partial<Student>): Promise<void> {
    const tableName = process.env.EDUCATION_TABLE_NAME;
    if (!tableName) {
      throw new Error('EDUCATION_TABLE_NAME environment variable not set');
    }

    logger.info('[update] Updating student', { userId, fields: Object.keys(updates) });

    // Build update expression
    const updateExpressionParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const attributeName = `#attr${index}`;
      const attributeValue = `:val${index}`;

      updateExpressionParts.push(`${attributeName} = ${attributeValue}`);
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = value;
    });

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'METADATA',
      },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await dynamodb.send(command);
    logger.info('[update] Student updated successfully', { userId });
  },
};
```

#### 3.4 Unit Tests for Paid Strategy
**File**: `backend/src/features/enrollment/strategies/__tests__/paid-enrollment.strategy.test.ts` (NEW FILE)
**Changes**: Add unit tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaidEnrollmentStrategy } from '../paid-enrollment.strategy.js';

// Mock dependencies
vi.mock('../../../lib/payment/stripe-provider.js');
vi.mock('../../courses/course.repository.js');
vi.mock('../../students/student.repository.js');

describe('PaidEnrollmentStrategy', () => {
  let strategy: PaidEnrollmentStrategy;

  beforeEach(() => {
    strategy = new PaidEnrollmentStrategy();
  });

  it('should create checkout session for paid course', async () => {
    // Test that strategy returns clientSecret and pending status
    expect(strategy).toBeDefined();
  });

  it('should throw error if course has no Stripe price ID', async () => {
    // Test error handling for missing price ID
    expect(strategy.enroll).toBeDefined();
  });

  it('should update student with Stripe customer ID on first payment', async () => {
    // Test that student.stripeCustomerId is updated
    expect(strategy.enroll).toBeDefined();
  });
});
```

---

## Phase 3.b: Validation Tests

### Automated Tests
```bash
cd backend
pnpm run test          # Unit tests including paid strategy
pnpm run lint          # Linting
pnpm run typecheck     # TypeScript compilation
```

### Expected Results
- ✅ All tests pass including paid enrollment strategy tests
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Strategy pattern correctly selects paid strategy for paid courses

---

## Phase 3.c: Manual Review and Optional Deployment

### Manual Verification Steps
1. Review paid enrollment strategy implementation
2. Verify that strategy returns `clientSecret` and `status: 'pending'`
3. Confirm that student is updated with Stripe customer ID
4. Check that enrollment service correctly selects paid strategy for `pricingModel === 'paid'`
5. Verify that return URL includes `{CHECKOUT_SESSION_ID}` placeholder

### Commit Decision
**STOP** and ask user:
- Should we commit the paid enrollment strategy?
- Should we deploy to preview environment?

### Success Criteria
- ✅ Development Completed: Paid enrollment strategy implemented and integrated
- ✅ All Validation Tests Passing: Unit tests, lint, typecheck all pass
- ✅ Stopped for Manual Review: User reviews, commits, and/or deploys to preview

---

## Phase 4.a: Webhook Handler with SQS Fallback

### Overview
Implement webhook endpoint to receive Stripe events, with synchronous processing and SQS fallback for failed attempts. Create a separate Lambda to process messages from SQS and update DynamoDB directly.

### Changes Required

#### 4.1 Webhook Routes
**File**: `backend/src/features/webhooks/stripe-webhook.routes.ts` (NEW FILE)
**Changes**: Create webhook endpoint

```typescript
import express from 'express';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { stripeProvider } from '../../lib/payment/stripe-provider.js';
import { enrollmentRepository } from '../enrollment/enrollment.repository.js';
import { studentRepository } from '../students/student.repository.js';
import { createLogger } from '../../lib/logger.js';
import type { Enrollment } from '../enrollment/enrollment.types.js';

const logger = createLogger('StripeWebhookRoutes');
const router = express.Router();
const sqsClient = new SQSClient({ region: 'us-east-1' });

/**
 * Process webhook event - create enrollment for successful payment
 */
async function processWebhookEvent(event: any): Promise<void> {
  logger.info('[processWebhookEvent] Processing event', {
    eventType: event.type,
    eventId: event.id,
  });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    logger.info('[processWebhookEvent] Checkout session completed', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      metadata: session.metadata,
    });

    // Only create enrollment if payment was successful
    if (session.payment_status !== 'paid') {
      logger.warn('[processWebhookEvent] Payment not completed, skipping enrollment', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
      return;
    }

    const userId = session.metadata.userId;
    const courseId = session.metadata.courseId;
    const paymentIntentId = session.payment_intent;

    if (!userId || !courseId) {
      throw new Error('Missing userId or courseId in session metadata');
    }

    // Check if enrollment already exists (idempotency)
    const existing = await enrollmentRepository.get(userId, courseId);
    if (existing) {
      logger.info('[processWebhookEvent] Enrollment already exists, skipping', {
        userId,
        courseId,
        existingPaymentStatus: existing.paymentStatus,
      });
      return;
    }

    // Create enrollment record
    const enrollment: Enrollment = {
      userId,
      courseId,
      enrollmentType: 'paid',
      enrolledAt: new Date().toISOString(),
      paymentStatus: 'completed',
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
      progress: 0,
      completed: false,
    };

    await enrollmentRepository.create(enrollment);

    logger.info('[processWebhookEvent] Enrollment created successfully', {
      userId,
      courseId,
      enrollmentType: 'paid',
      stripeSessionId: session.id,
    });

    // Update student with Stripe customer ID if not already set
    const student = await studentRepository.get(userId);
    if (student && !student.stripeCustomerId && session.customer) {
      logger.info('[processWebhookEvent] Updating student with Stripe customer ID', {
        userId,
        customerId: session.customer,
      });

      await studentRepository.update(userId, {
        stripeCustomerId: session.customer,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

/**
 * POST /api/webhooks/stripe
 * Stripe webhook endpoint (no authentication required)
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  logger.info('[POST /stripe] Webhook received');

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    logger.error('[POST /stripe] Missing stripe-signature header');
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event;
  try {
    // Verify webhook signature
    event = stripeProvider.verifyWebhookSignature(
      req.body.toString(),
      signature as string
    );

    logger.info('[POST /stripe] Webhook signature verified', {
      eventType: event.type,
      eventId: event.id,
    });
  } catch (error) {
    logger.error('[POST /stripe] Webhook signature verification failed', { error });
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  // Attempt synchronous processing with retries
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await processWebhookEvent(event);
      logger.info('[POST /stripe] Webhook processed successfully', {
        eventType: event.type,
        eventId: event.id,
        attempt,
      });
      res.status(200).json({ received: true });
      return;
    } catch (error) {
      lastError = error as Error;
      logger.error('[POST /stripe] Webhook processing failed', {
        eventType: event.type,
        eventId: event.id,
        attempt,
        maxRetries,
        error: lastError.message,
      });

      if (attempt < maxRetries) {
        // Brief backoff before retry
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
  }

  // All sync retries failed - fallback to SQS
  logger.warn('[POST /stripe] All sync attempts failed, sending to SQS', {
    eventType: event.type,
    eventId: event.id,
  });

  try {
    const queueUrl = process.env.WEBHOOK_QUEUE_URL;
    if (!queueUrl) {
      throw new Error('WEBHOOK_QUEUE_URL environment variable not set');
    }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: event.type,
        },
        eventId: {
          DataType: 'String',
          StringValue: event.id,
        },
      },
    });

    await sqsClient.send(command);

    logger.info('[POST /stripe] Event queued to SQS successfully', {
      eventType: event.type,
      eventId: event.id,
      queueUrl,
    });

    // Return 200 because we queued it for async processing
    res.status(200).json({ received: true, queued: true });
  } catch (sqsError) {
    logger.error('[POST /stripe] Failed to queue to SQS', {
      eventType: event.type,
      eventId: event.id,
      error: (sqsError as Error).message,
    });

    // Both sync and queue failed - return 500 so Stripe retries
    res.status(500).json({ error: 'Processing failed' });
  }
});

export default router;
```

#### 4.2 Webhook Processor Lambda
**File**: `backend/src/lambdas/webhook-processor.ts` (NEW FILE)
**Changes**: Create Lambda to process SQS messages

```typescript
import type { SQSEvent, SQSHandler } from 'aws-lambda';
import { enrollmentRepository } from '../features/enrollment/enrollment.repository.js';
import { studentRepository } from '../features/students/student.repository.js';
import { createLogger } from '../lib/logger.js';
import type { Enrollment } from '../features/enrollment/enrollment.types.js';

const logger = createLogger('WebhookProcessor');

/**
 * Process Stripe webhook event from SQS queue
 * Updates DynamoDB directly
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  logger.info('[handler] Processing SQS batch', {
    recordCount: event.Records.length,
  });

  for (const record of event.Records) {
    const messageId = record.messageId;

    try {
      const webhookEvent = JSON.parse(record.body);

      logger.info('[handler] Processing webhook event from queue', {
        messageId,
        eventType: webhookEvent.type,
        eventId: webhookEvent.id,
      });

      if (webhookEvent.type === 'checkout.session.completed') {
        const session = webhookEvent.data.object;

        logger.info('[handler] Checkout session completed', {
          messageId,
          sessionId: session.id,
          paymentStatus: session.payment_status,
        });

        // Only create enrollment if payment was successful
        if (session.payment_status !== 'paid') {
          logger.warn('[handler] Payment not completed, skipping enrollment', {
            messageId,
            sessionId: session.id,
            paymentStatus: session.payment_status,
          });
          continue;
        }

        const userId = session.metadata.userId;
        const courseId = session.metadata.courseId;
        const paymentIntentId = session.payment_intent;

        if (!userId || !courseId) {
          throw new Error('Missing userId or courseId in session metadata');
        }

        // Check if enrollment already exists (idempotency)
        const existing = await enrollmentRepository.get(userId, courseId);
        if (existing) {
          logger.info('[handler] Enrollment already exists, skipping', {
            messageId,
            userId,
            courseId,
            existingPaymentStatus: existing.paymentStatus,
          });
          continue;
        }

        // Create enrollment record
        const enrollment: Enrollment = {
          userId,
          courseId,
          enrollmentType: 'paid',
          enrolledAt: new Date().toISOString(),
          paymentStatus: 'completed',
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          progress: 0,
          completed: false,
        };

        await enrollmentRepository.create(enrollment);

        logger.info('[handler] Enrollment created successfully', {
          messageId,
          userId,
          courseId,
          enrollmentType: 'paid',
          stripeSessionId: session.id,
        });

        // Update student with Stripe customer ID if not already set
        const student = await studentRepository.get(userId);
        if (student && !student.stripeCustomerId && session.customer) {
          logger.info('[handler] Updating student with Stripe customer ID', {
            messageId,
            userId,
            customerId: session.customer,
          });

          await studentRepository.update(userId, {
            stripeCustomerId: session.customer,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      logger.info('[handler] Message processed successfully', { messageId });
    } catch (error) {
      logger.error('[handler] Failed to process message', {
        messageId,
        error: (error as Error).message,
      });
      // Throw error to trigger SQS retry
      throw error;
    }
  }

  logger.info('[handler] Batch processing complete');
};
```

#### 4.3 Register Webhook Routes
**File**: `backend/src/app.ts`
**Changes**: Add webhook routes

```typescript
import express, { Express } from 'express';
import enrollmentRoutes from './features/enrollment/enrollment.routes.js';
import studentRoutes from './features/students/student.routes.js';
import courseRoutes from './features/courses/course.routes.js';
import webhookRoutes from './features/webhooks/stripe-webhook.routes.js'; // ADD THIS
import { createLogger } from './lib/logger.js';

const logger = createLogger('ExpressApiFunction');

// Initialize Express app
const app: Express = express();
const port = process.env.PORT || 8080;

// Middleware - IMPORTANT: Webhook route needs raw body, so add it BEFORE json middleware
app.use('/api/webhooks', webhookRoutes); // ADD THIS - before express.json()

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

// Feature-based routes
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);

// Start server (only in production, not during tests)
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });
}

export default app;
```

#### 4.4 Update SAM Template
**File**: `backend/template.yaml`
**Changes**: Add SQS queue, DLQ, webhook processor Lambda, and API Gateway webhook route

```yaml
# Add to Parameters section
Parameters:
  # ... existing parameters ...

  StripeSecretArn:
    Type: String
    Description: ARN of Secrets Manager secret containing Stripe API keys
    Default: arn:aws:secretsmanager:us-east-1:853219709625:secret:learnermax/stripe-3NHb9f

# Add to Resources section
Resources:
  # ... existing resources ...

  # SQS Queue for failed webhook processing
  WebhookQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub learnermax-webhook-queue-${Environment}
      VisibilityTimeout: 300  # 5 minutes for processor Lambda
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt WebhookDLQ.Arn
        maxReceiveCount: 5
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Project
          Value: LearnerMax

  # Dead Letter Queue for webhook processing
  WebhookDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub learnermax-webhook-dlq-${Environment}
      MessageRetentionPeriod: 1209600  # 14 days
      Tags:
        - Key: Environment
          Value: !Ref Environment
        - Key: Project
          Value: LearnerMax

  # CloudWatch Alarm for DLQ messages
  WebhookDLQAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub learnermax-webhook-dlq-alarm-${Environment}
      AlarmDescription: Alert when messages arrive in Webhook DLQ
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
      AlarmActions:
        - !Ref ObservabilityAlertTopic
      TreatMissingData: notBreaching

  # Webhook Processor Lambda Function
  WebhookProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: dist/lambdas/webhook-processor.handler
      Runtime: nodejs22.x
      Architectures:
        - x86_64
      MemorySize: 512
      Timeout: 300
      Description: Processes Stripe webhook events from SQS queue
      Environment:
        Variables:
          EDUCATION_TABLE_NAME: !Ref EducationTable
          AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
      Layers:
        - !Ref AdotLayerArn
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref EducationTable
      Events:
        SQSEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt WebhookQueue.Arn
            BatchSize: 1

  # Update Express API Function to include webhook environment variables
  ExpressApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./
      Handler: run.sh
      Runtime: nodejs22.x
      Architectures:
      - x86_64
      MemorySize: 1024
      Timeout: 30
      Description: Express.js API running on Lambda with Web Adapter
      Environment:
        Variables:
          # Lambda Web Adapter configuration
          AWS_LAMBDA_EXEC_WRAPPER: /opt/bootstrap
          RUST_LOG: info
          PORT: 8080
          # Application configuration
          EDUCATION_TABLE_NAME: !Ref EducationTable
          COGNITO_USER_POOL_ID: !Ref LearnerMaxUserPool
          COGNITO_CLIENT_ID: !Ref LearnerMaxUserPoolClient
          WEBHOOK_QUEUE_URL: !Ref WebhookQueue  # ADD THIS
          FRONTEND_URL: !Ref FrontendDomain      # ADD THIS
      Layers:
        - !Sub arn:aws:lambda:${AWS::Region}:753240598075:layer:LambdaAdapterLayerX86:25
        - !Ref AdotLayerArn
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref EducationTable
        - Statement:  # ADD THIS - SQS send permission
            - Effect: Allow
              Action:
                - sqs:SendMessage
              Resource: !GetAtt WebhookQueue.Arn
        - Statement:  # ADD THIS - Secrets Manager read permission
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Ref StripeSecretArn
      Events:
        RootEndpoint:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
            RestApiId: !Ref ApiGatewayApi

# Add to Outputs section
Outputs:
  # ... existing outputs ...

  WebhookQueueUrl:
    Description: URL of webhook processing queue
    Value: !Ref WebhookQueue
    Export:
      Name: !Sub ${AWS::StackName}-WebhookQueueUrl

  WebhookDLQUrl:
    Description: URL of webhook dead letter queue
    Value: !Ref WebhookDLQ
    Export:
      Name: !Sub ${AWS::StackName}-WebhookDLQUrl
```

**Note**: The API Gateway already doesn't enforce authentication on routes that don't check for userId. The webhook route doesn't call `getUserIdFromContext()`, so it's automatically unauthenticated.

#### 4.5 Install SQS SDK
**File**: `backend/package.json`
**Changes**: Add SQS client dependency

```bash
cd backend
pnpm add @aws-sdk/client-sqs
```

---

## Phase 4.b: Validation Tests

### Automated Tests
```bash
cd backend
pnpm run test          # Unit tests
pnpm run lint          # Linting
pnpm run typecheck     # TypeScript compilation
pnpm run build         # Build for deployment
sam validate           # Validate SAM template
```

### Expected Results
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ SAM template validates successfully
- ✅ Build completes without errors

---

## Phase 4.c: Manual Review and Optional Deployment

### Manual Verification Steps
1. Review webhook route implementation and verify signature verification
2. Verify SQS fallback logic (3 retries, then queue)
3. Check webhook processor Lambda for DynamoDB updates
4. Confirm SAM template includes all new resources (queue, DLQ, Lambda, alarm)
5. Verify that webhook route is registered BEFORE express.json() middleware

### Deployment Steps (if deploying to preview)
```bash
cd backend
pnpm run build
sam build
sam deploy --parameter-overrides Environment=preview FrontendDomain=<preview-url>
```

### Post-Deployment Tasks
1. Get webhook endpoint URL from API Gateway
2. Configure webhook in Stripe dashboard:
   - URL: `https://<api-gateway-url>/Prod/api/webhooks/stripe`
   - Events: `checkout.session.completed`
3. Get webhook signing secret from Stripe
4. Run `scripts/update-stripe-webhook-secret.sh` to add to Secrets Manager

### Commit Decision
**STOP** and ask user:
- Should we commit the webhook handler and SQS infrastructure?
- Should we deploy to preview environment?
- Should we configure Stripe webhook now?

### Success Criteria
- ✅ Development Completed: Webhook route, processor Lambda, and SQS queue implemented
- ✅ All Validation Tests Passing: Unit tests, lint, typecheck, build, SAM validate all pass
- ✅ Stopped for Manual Review: User reviews, commits, and/or deploys to preview

---

## Phase 5.a: Frontend - Conditional Enrollment & Checkout Page

### Overview
Update frontend to detect pricing model and show Stripe embedded checkout for paid courses. Install Stripe React packages and create checkout page.

### Changes Required

#### 5.1 Install Stripe React Packages
**File**: `frontend/package.json`
**Changes**: Add Stripe dependencies

```bash
cd frontend
pnpm add @stripe/stripe-js @stripe/react-stripe-js
```

#### 5.2 Add Stripe Publishable Key to Environment
**File**: `frontend/.env.local`
**Changes**: Add environment variable

```bash
# Add this line (get key from AWS Secrets Manager or Stripe dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### 5.3 Update CourseCard Component
**File**: `frontend/components/dashboard/CourseCard.tsx`
**Changes**: Add conditional enrollment logic (lines 25-38)

```typescript
import { useRouter } from 'next/navigation';
// ... other imports ...

export default function CourseCard({ course, enrollment, onEnroll }: CourseCardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnrollClick = async () => {
    setError(null);
    setIsEnrolling(true);

    try {
      // MODIFY THIS: Check pricing model
      if (course.pricingModel === 'paid') {
        // Redirect to checkout page for paid courses
        router.push(`/checkout?courseId=${course.courseId}`);
      } else {
        // Call existing enrollment API for free courses
        if (onEnroll) {
          await onEnroll(course.courseId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setIsEnrolling(false);
    }
  };

  // ... rest of component unchanged
}
```

#### 5.4 Create Stripe Actions
**File**: `frontend/app/actions/stripe.ts` (NEW FILE)
**Changes**: Add Stripe-related server actions

```typescript
'use server';

import { getAuthToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Create Stripe checkout session for a paid course
 * Returns client secret for embedded checkout
 */
export async function createCheckoutSession(
  courseId: string
): Promise<{ clientSecret: string } | { error: string }> {
  console.log('[createCheckoutSession] Starting checkout for course:', courseId);

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[createCheckoutSession] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/enrollments`;
    console.log('[createCheckoutSession] Calling enrollment API:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId }),
      cache: 'no-store',
    });

    console.log('[createCheckoutSession] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[createCheckoutSession] Backend error:', errorText);
      return { error: `Failed to create checkout session: ${response.statusText}` };
    }

    const result = await response.json();
    console.log('[createCheckoutSession] Checkout session created', {
      hasClientSecret: !!result.clientSecret,
      status: result.status,
    });

    if (!result.clientSecret) {
      return { error: 'No client secret returned from server' };
    }

    return { clientSecret: result.clientSecret };
  } catch (error) {
    console.error('[createCheckoutSession] Exception:', error);
    return { error: 'Failed to create checkout session' };
  }
}

/**
 * Retrieve checkout session status
 * Used on return page to verify payment
 */
export async function getCheckoutSessionStatus(
  sessionId: string
): Promise<{ status: string; customerEmail?: string } | { error: string }> {
  console.log('[getCheckoutSessionStatus] Checking session:', sessionId);

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[getCheckoutSessionStatus] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/checkout/session/${sessionId}`;
    console.log('[getCheckoutSessionStatus] Calling API:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    console.log('[getCheckoutSessionStatus] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getCheckoutSessionStatus] Backend error:', errorText);
      return { error: 'Failed to retrieve session status' };
    }

    const session = await response.json();
    console.log('[getCheckoutSessionStatus] Session retrieved', {
      status: session.status,
      paymentStatus: session.payment_status,
    });

    return {
      status: session.status,
      customerEmail: session.customer_details?.email,
    };
  } catch (error) {
    console.error('[getCheckoutSessionStatus] Exception:', error);
    return { error: 'Failed to retrieve session status' };
  }
}
```

#### 5.5 Create Checkout Page
**File**: `frontend/app/checkout/page.tsx` (NEW FILE)
**Changes**: Create embedded checkout page

```typescript
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '../actions/stripe';
import { getCourse } from '../actions/courses';
import type { Course } from '../actions/courses';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');

  const [course, setCourse] = useState<Course | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initCheckout() {
      if (!courseId) {
        setError('No course ID provided');
        setIsLoading(false);
        return;
      }

      try {
        // Fetch course details
        const courseResult = await getCourse(courseId);
        if ('error' in courseResult) {
          setError(courseResult.error);
          setIsLoading(false);
          return;
        }

        setCourse(courseResult.course);

        // Create checkout session
        const result = await createCheckoutSession(courseId);
        if ('error' in result) {
          setError(result.error);
          setIsLoading(false);
          return;
        }

        setClientSecret(result.clientSecret);
        setIsLoading(false);
      } catch (err) {
        console.error('[CheckoutContent] Error:', err);
        setError('Failed to initialize checkout');
        setIsLoading(false);
      }
    }

    initCheckout();
  }, [courseId]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Checkout Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Enrollment</h1>
          <p className="text-gray-600 mb-6">
            You're enrolling in: <span className="font-semibold">{course?.name}</span>
          </p>
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg text-gray-700">Course Price:</span>
              <span className="text-2xl font-bold text-gray-900">${course?.price}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
```

#### 5.6 Backend Checkout Session Status Endpoint
**File**: `backend/src/features/webhooks/stripe-webhook.routes.ts`
**Changes**: Add session status endpoint

```typescript
// ... existing imports ...

/**
 * GET /api/checkout/session/:sessionId
 * Retrieve checkout session status (authenticated)
 */
router.get('/checkout/session/:sessionId', async (req, res) => {
  const userId = getUserIdFromContext(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { sessionId } = req.params;

  logger.info('[GET /checkout/session/:sessionId] Retrieving session', {
    userId,
    sessionId,
  });

  try {
    const session = await stripeProvider.getCheckoutSession(sessionId);
    res.status(200).json(session);
  } catch (error) {
    logger.error('[GET /checkout/session/:sessionId] Failed to retrieve session', {
      userId,
      sessionId,
      error: (error as Error).message,
    });
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

export default router;
```

---

## Phase 5.b: Validation Tests

### Automated Tests
```bash
cd frontend
pnpm run test          # Unit tests
pnpm run lint          # Linting
pnpm run typecheck     # TypeScript compilation
pnpm run build         # Next.js build

cd ../backend
pnpm run test          # Backend tests
pnpm run lint          # Linting
pnpm run typecheck     # TypeScript compilation
```

### Expected Results
- ✅ Frontend tests pass
- ✅ Backend tests pass
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Builds complete successfully

---

## Phase 5.c: Manual Review and Optional Deployment

### Manual Verification Steps
1. Review CourseCard conditional logic (free vs paid)
2. Verify Stripe React packages are installed
3. Check that checkout page uses `EmbeddedCheckoutProvider` with `clientSecret`
4. Confirm that `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
5. Verify backend has session status endpoint

### Commit Decision
**STOP** and ask user:
- Should we commit the frontend checkout implementation?
- Should we deploy frontend to preview?
- Should we deploy backend to preview (for session status endpoint)?

### Success Criteria
- ✅ Development Completed: Conditional enrollment and checkout page implemented
- ✅ All Validation Tests Passing: Unit tests, lint, typecheck, builds all pass
- ✅ Stopped for Manual Review: User reviews, commits, and/or deploys to preview

---

## Phase 6.a: Return Page & Success Flow

### Overview
Create return page that users land on after payment. Page verifies enrollment was created by webhook and shows success message.

### Changes Required

#### 6.1 Return Page
**File**: `frontend/app/enrollment/return/page.tsx` (NEW FILE)
**Changes**: Create return page with enrollment verification

```typescript
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCheckoutSessionStatus } from '@/app/actions/stripe';
import { checkEnrollment } from '@/app/actions/enrollments';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function ReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your payment...');
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        setStatus('error');
        setMessage('No session ID found');
        return;
      }

      try {
        // Get session status from Stripe
        const sessionResult = await getCheckoutSessionStatus(sessionId);
        if ('error' in sessionResult) {
          setStatus('error');
          setMessage(sessionResult.error);
          return;
        }

        if (sessionResult.status !== 'complete') {
          setStatus('error');
          setMessage('Payment was not completed');
          return;
        }

        // Extract course ID from session (would need to be returned from backend)
        // For now, we'll poll enrollment endpoint until enrollment appears

        setMessage('Payment successful! Setting up your enrollment...');

        // Poll for enrollment (webhook might still be processing)
        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = 2000; // 2 seconds

        const pollForEnrollment = async () => {
          attempts++;

          // We don't have courseId from session, so we redirect to dashboard
          // The webhook will have created the enrollment by now
          setTimeout(() => {
            setStatus('success');
            setMessage('Enrollment complete! Redirecting to dashboard...');
            setTimeout(() => router.push('/dashboard'), 2000);
          }, 2000);
        };

        await pollForEnrollment();
      } catch (error) {
        console.error('[ReturnContent] Error:', error);
        setStatus('error');
        setMessage('Failed to verify payment');
      }
    }

    verifyPayment();
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing...</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Error</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Return to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
```

#### 6.2 Check Enrollment Action
**File**: `frontend/app/actions/enrollments.ts`
**Changes**: Add enrollment check function if it doesn't exist

```typescript
// Add this function if it doesn't exist

/**
 * Check if user is enrolled in a course
 */
export async function checkEnrollment(
  courseId: string
): Promise<{ enrolled: boolean } | { error: string }> {
  console.log('[checkEnrollment] Checking enrollment for course:', courseId);

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[checkEnrollment] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/enrollments/check/${courseId}`;
    console.log('[checkEnrollment] Calling API:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    console.log('[checkEnrollment] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[checkEnrollment] Backend error:', errorText);
      return { error: 'Failed to check enrollment' };
    }

    const result = await response.json();
    console.log('[checkEnrollment] Result:', result);

    return { enrolled: result.enrolled };
  } catch (error) {
    console.error('[checkEnrollment] Exception:', error);
    return { error: 'Failed to check enrollment' };
  }
}
```

---

## Phase 6.b: Validation Tests

### Automated Tests
```bash
cd frontend
pnpm run test          # Unit tests
pnpm run lint          # Linting
pnpm run typecheck     # TypeScript compilation
pnpm run build         # Next.js build
```

### Expected Results
- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Build completes successfully

---

## Phase 6.c: Manual Review and Optional Deployment

### Manual Verification Steps
1. Review return page implementation
2. Verify that page handles missing session ID
3. Check that success state shows after verification
4. Confirm that error state handles failed payments
5. Verify redirect to dashboard after success

### Commit Decision
**STOP** and ask user:
- Should we commit the return page implementation?
- Should we deploy frontend to preview?

### Success Criteria
- ✅ Development Completed: Return page implemented with enrollment verification
- ✅ All Validation Tests Passing: Unit tests, lint, typecheck, build all pass
- ✅ Stopped for Manual Review: User reviews, commits, and/or deploys to preview

---

## Phase 7.a: End-to-End Testing

### Overview
Manually test the complete paid enrollment flow from start to finish using Stripe test cards.

### Testing Checklist

#### 7.1 Free Course Enrollment (Regression Test)
- [ ] Navigate to dashboard
- [ ] Click "Enroll Now" on a free course
- [ ] Verify immediate enrollment
- [ ] Verify "Enrolled" badge appears
- [ ] Check backend logs for successful enrollment

#### 7.2 Paid Course Enrollment - Success Flow
- [ ] Navigate to dashboard
- [ ] Identify a paid course (should show price badge)
- [ ] Click "Enroll Now" on paid course
- [ ] Verify redirect to `/checkout?courseId=...`
- [ ] Verify Stripe embedded form loads
- [ ] Verify course name and price display correctly
- [ ] Enter Stripe test card: `4242 4242 4242 4242`
- [ ] Enter expiry: Any future date
- [ ] Enter CVC: Any 3 digits
- [ ] Submit payment
- [ ] Verify redirect to `/enrollment/return?session_id=...`
- [ ] Verify "Payment Successful" message appears
- [ ] Verify automatic redirect to dashboard
- [ ] Verify "Enrolled" badge appears on paid course
- [ ] Check backend DynamoDB for enrollment record with:
  - `enrollmentType: 'paid'`
  - `paymentStatus: 'completed'`
  - `stripeSessionId` populated
  - `stripePaymentIntentId` populated
- [ ] Check student record has `stripeCustomerId` populated

#### 7.3 Paid Course Enrollment - Failed Payment
- [ ] Navigate to dashboard
- [ ] Click "Enroll Now" on paid course
- [ ] Verify redirect to checkout
- [ ] Enter Stripe test card for declined payment: `4000 0000 0000 0002`
- [ ] Submit payment
- [ ] Verify error message appears
- [ ] Verify user can retry payment
- [ ] Verify no enrollment created in database

#### 7.4 Webhook Processing
- [ ] Trigger a successful payment
- [ ] Check Express API logs for webhook receipt
- [ ] Verify signature verification succeeds
- [ ] Verify enrollment created synchronously (first attempt)
- [ ] Manually trigger SQS processing by:
  - Temporarily breaking DynamoDB connection
  - Making a payment
  - Verify message sent to SQS queue
  - Restore DynamoDB connection
  - Verify webhook processor Lambda processes message
  - Verify enrollment created from SQS message

#### 7.5 Webhook Resilience
- [ ] Verify SQS queue exists in AWS console
- [ ] Verify DLQ exists and is empty
- [ ] Verify CloudWatch alarm exists for DLQ
- [ ] Manually send malformed message to queue
- [ ] Verify message moves to DLQ after max retries
- [ ] Verify CloudWatch alarm triggers

#### 7.6 Idempotency
- [ ] Make successful payment for a course
- [ ] Manually replay same webhook event to endpoint
- [ ] Verify no duplicate enrollment created
- [ ] Check logs for "Enrollment already exists" message

#### 7.7 Cross-Browser Testing
- [ ] Test checkout flow in Chrome
- [ ] Test checkout flow in Firefox
- [ ] Test checkout flow in Safari
- [ ] Verify Stripe embedded form renders in all browsers

---

## Phase 7.b: Validation Tests

### Automated Tests
Run full test suite for both frontend and backend:

```bash
# Backend
cd backend
pnpm run test
pnpm run test:coverage
pnpm run lint
pnpm run typecheck

# Frontend
cd ../frontend
pnpm run test
pnpm run test:coverage
pnpm run lint
pnpm run typecheck
```

### Expected Results
- ✅ All backend tests pass
- ✅ All frontend tests pass
- ✅ Test coverage meets requirements
- ✅ No TypeScript errors
- ✅ No linting errors

---

## Phase 7.c: Manual Review and Production Deployment

### Manual Verification Steps
1. Review all manual test results from Phase 7.a
2. Verify that all test checklist items passed
3. Check CloudWatch logs for any errors
4. Verify CloudWatch dashboard shows metrics
5. Review SQS queue and DLQ status

### Documentation Review
- [ ] Update README with Stripe setup instructions
- [ ] Document webhook configuration steps
- [ ] Document environment variables needed
- [ ] Document Stripe test cards for testing

### Deployment Decision
**STOP** and ask user:
- Are all manual tests passing?
- Should we commit any remaining changes?
- Should we deploy to production?
- Should we configure production Stripe webhook?

### Success Criteria
- ✅ Development Completed: All phases implemented
- ✅ All Validation Tests Passing: Unit tests, integration tests, manual tests
- ✅ Stopped for Manual Review: User reviews final deployment decision

---

## Testing Strategy

### Unit Tests
- **Payment Provider**: Mock Stripe SDK, test session creation and signature verification
- **Paid Enrollment Strategy**: Mock payment provider, test strategy returns client secret
- **Webhook Route**: Mock Stripe events, test event processing and SQS fallback
- **Webhook Processor Lambda**: Mock DynamoDB, test enrollment creation from SQS message
- **Frontend Components**: Test conditional rendering based on pricing model

### Integration Tests
- **Backend**: Test enrollment API with both free and paid courses
- **Webhook Flow**: Test webhook → enrollment creation flow
- **SQS Flow**: Test webhook → SQS → Lambda → enrollment flow

### Manual Tests
- **End-to-End**: Complete user journey from dashboard to enrollment
- **Stripe Test Cards**: Use Stripe test cards to verify payment flows
- **Webhook Testing**: Use Stripe CLI to send test webhooks locally
- **Error Scenarios**: Test declined cards, network errors, timeout scenarios

### Test Coverage Goals
- Backend: > 80% coverage
- Frontend: > 70% coverage
- Critical paths: 100% coverage (payment processing, webhook handling)

---

## References

### Research Documents
- Research: `specs/student_enrollment/slices/stripe-enrollment/research.md`
- Spec: `specs/student_enrollment/slices/stripe-enrollment/stripe-enrollment.md`

### Key Code References

#### Backend
- Enrollment service: `backend/src/features/enrollment/enrollment.service.ts:10-63`
- Free enrollment strategy: `backend/src/features/enrollment/strategies/free-enrollment.strategy.ts:9-29`
- Enrollment repository: `backend/src/features/enrollment/enrollment.repository.ts:10-46`
- Student repository: `backend/src/features/students/student.repository.ts`
- Course types: `backend/src/features/courses/course.types.ts:14-24`
- Enrollment types: `backend/src/features/enrollment/enrollment.types.ts:1-17`
- SAM template: `backend/template.yaml:353-369` (API Gateway auth)

#### Frontend
- CourseCard component: `frontend/components/dashboard/CourseCard.tsx:25-38`
- Dashboard component: `frontend/components/dashboard/DashboardContent.tsx:87-100`
- Course actions: `frontend/app/actions/courses.ts:26-36`
- Enrollment actions: `frontend/app/actions/enrollments.ts:44-102`

### External Documentation
- [Stripe Embedded Checkout Docs](https://stripe.com/docs/payments/checkout/how-checkout-works?payment-ui=embedded-form)
- [Stripe React Integration](https://stripe.com/docs/stripe-js/react)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Test Cards](https://stripe.com/docs/testing)

---

## Implementation Notes

### Stripe Embedded Checkout vs Hosted Checkout
We're using **Embedded Checkout** (`ui_mode: 'embedded'`), not Hosted Checkout:
- **Embedded**: Payment form displays on our site using React components
- **Hosted**: User redirects to Stripe-hosted payment page
- Our approach: Backend returns `client_secret`, frontend mounts form using `<EmbeddedCheckout />`

### Why SQS Fallback?
Webhook processing uses synchronous-first approach with SQS fallback:
1. **Attempt sync processing** (3 retries) - fast path for most webhooks
2. **If sync fails**: Send to SQS queue for async processing
3. **If queue fails**: Return 500 so Stripe retries webhook
4. **SQS processor**: Separate Lambda reads queue and updates DynamoDB directly
5. **DLQ + Alarm**: Failed messages move to DLQ and trigger CloudWatch alert

Benefits:
- Fast processing for 99% of webhooks (no queue latency)
- Resilient to transient failures (DB connection issues, timeouts)
- No lost payments (SQS retries + DLQ + alarms)
- Stripe auto-retries if both sync and queue fail

### Environment Variables Required

**Backend** (`backend/.env` or SAM parameters):
- `EDUCATION_TABLE_NAME` - DynamoDB table name
- `WEBHOOK_QUEUE_URL` - SQS queue URL for failed webhooks
- `FRONTEND_URL` - Frontend URL for return_url (e.g., `https://app.learnermax.com`)

**Frontend** (`frontend/.env.local`):
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (starts with `pk_test_` or `pk_live_`)

**AWS Secrets Manager** (`learnermax/stripe`):
- `STRIPE_SECRET_KEY` - Stripe secret key (starts with `sk_test_` or `sk_live_`)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (starts with `whsec_`)

### Post-Deployment Checklist
After deploying to any environment:
1. Get API Gateway webhook URL: `https://<api-id>.execute-api.us-east-1.amazonaws.com/Prod/api/webhooks/stripe`
2. Configure webhook in Stripe dashboard (Settings → Webhooks → Add endpoint)
3. Select event: `checkout.session.completed`
4. Get webhook signing secret from Stripe
5. Run `scripts/update-stripe-webhook-secret.sh` to add secret to Secrets Manager
6. Test with Stripe test card: `4242 4242 4242 4242`
7. Verify enrollment created in DynamoDB
8. Monitor CloudWatch logs and SQS queue

---

## Open Questions

None - all questions resolved during planning:
✅ Student Stripe customer ID: Added to Student type, populated on first payment
✅ Webhook SQS fallback: Implemented with sync-first approach
✅ Payment intent ID: Added to Enrollment type for future refund capability
✅ Manual testing: Included after each phase with optional preview deployment
