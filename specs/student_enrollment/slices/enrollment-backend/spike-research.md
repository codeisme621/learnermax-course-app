# Research: Course Enrollment Extensibility Patterns

**Date**: 2025-10-12
**Research Question**: How can we design a course enrollment system that supports multiple scenarios (single course, multiple courses, free, paid, bundles) with proven extensibility patterns?

## Summary

This research documents the current LearnerMax implementation and identifies proven patterns for building an extensible course enrollment system. The platform currently has:

- **Authentication**: Fully implemented with Auth.js + AWS Cognito (OAuth and email/password)
- **User onboarding**: Event-driven architecture (Cognito → SNS → Lambda → DynamoDB)
- **Student model**: Includes `enrolledCourses: string[]` field, ready for course enrollment
- **Course infrastructure**: DynamoDB table exists, but source code for course API is missing (only compiled files exist)
- **Frontend**: Uses mock data; no active enrollment logic beyond user signup

The research identifies specific design patterns from the existing codebase (Factory, Configuration-based switching, Event-driven) and external proven patterns (Strategy, Builder, Single-Table Design) that can be applied to support multiple enrollment scenarios with minimal refactoring.

---

## Current LearnerMax Implementation

### Authentication & User Onboarding

**Architecture**: Event-driven onboarding flow
**Files**:
- `/home/rico/projects/learnermax-course-app/frontend/lib/auth.ts:28-93` - Auth.js configuration with dual providers
- `/home/rico/projects/learnermax-course-app/backend/src/lambdas/post-confirmation.ts:26-110` - PostConfirmation trigger
- `/home/rico/projects/learnermax-course-app/backend/src/lambdas/student-onboarding.ts:33-115` - Student record creation

**Flow**:
```
User Signs Up (Cognito)
  ↓
PostConfirmation Lambda publishes to SNS
  ↓
Student Onboarding Lambda creates DynamoDB record
  ↓
Student record includes: userId, email, name, signUpMethod, enrolledCourses: []
```

**Key Pattern**: The `signUpMethod: 'email' | 'google'` enum pattern demonstrates how to track different user acquisition methods - directly applicable to tracking enrollment types (`'free' | 'paid' | 'bundle'`).

**Extensibility**: The SNS topic allows multiple consumers. A new "Enrollment Processing" Lambda could subscribe to handle course-specific onboarding logic.

### Database Schema

**Students Table** (`/home/rico/projects/learnermax-course-app/backend/template.yaml:133-160`):
```typescript
interface Student {
  userId: string;           // PK (Cognito sub)
  email: string;            // GSI: email-index
  name: string;
  signUpMethod: 'email' | 'google';
  enrolledCourses: string[];  // ← Ready for course IDs
  createdAt: string;
  updatedAt: string;
}
```

**Courses Table** (`template.yaml:162-178`): Defined but unused
- Primary key: `courseId`
- No source code exists (only compiled `backend/dist/services/course.service.js`)

**Update Pattern** (`/home/rico/projects/learnermax-course-app/backend/src/models/student.ts:63-101`):
The `updateStudent()` function dynamically builds DynamoDB update expressions - can add courses to `enrolledCourses` array without schema changes.

### Frontend Page Flow

**Routing**: Next.js App Router (`/home/rico/projects/learnermax-course-app/frontend/app/`)

**Current User Journey**:
```
Landing (/)
  → Enroll (/enroll?courseid=course-001)  ← courseid captured but unused
    → Verify Email (/verify-email?email=...)
      → Sign In (/signin?callbackUrl=/dashboard)
        → Dashboard (/dashboard)  ← No course display yet
```

**Protected Routes** (`/home/rico/projects/learnermax-course-app/frontend/middleware.ts:1-5`, `/home/rico/projects/learnermax-course-app/frontend/auth.config.ts:8-30`):
- Middleware runs on all routes (except API, static files)
- `authorized()` callback checks authentication status
- Redirects authenticated users away from auth pages
- Protects `/dashboard` routes

**Key Gap**: The `courseid` query parameter is passed through CTAs but never persisted during enrollment.

### Existing Extensibility Patterns

#### 1. Factory Pattern

**Logger Factory** (`/home/rico/projects/learnermax-course-app/backend/src/lib/logger.ts:3-8`):
```typescript
export const createLogger = (serviceName: string): Logger => {
  return new Logger({
    serviceName,
    logLevel: (process.env.LOG_LEVEL as any) || 'INFO',
  });
};
```

**Application to Enrollment**: Could create enrollment processors by type:
```typescript
export const createEnrollmentProcessor = (type: 'free' | 'paid' | 'bundle') => {
  const processors = {
    free: new FreeEnrollmentProcessor(),
    paid: new PaidEnrollmentProcessor(stripeService),
    bundle: new BundleEnrollmentProcessor(stripeService)
  };
  return processors[type];
};
```

#### 2. Configuration-Based Switching

**Sign-Up Method Detection** (`/home/rico/projects/learnermax-course-app/backend/src/lambdas/post-confirmation.ts:44-54`):
```typescript
const signUpMethod = userName.includes('Google_') || userName.includes('google_')
  ? 'google'
  : 'email';
```

**Application to Enrollment**: Store `enrollmentType` field alongside course enrollment:
```typescript
interface EnrollmentRecord {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid' | 'bundle';
  enrolledAt: string;
  paymentStatus?: 'pending' | 'completed';
  stripeSessionId?: string;
}
```

#### 3. Dynamic Update Pattern

**Student Update** (`/home/rico/projects/learnermax-course-app/backend/src/models/student.ts:63-101`):
```typescript
export const updateStudent = async (
  userId: string,
  updates: Partial<Pick<Student, 'name' | 'enrolledCourses'>>
): Promise<Student> => {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, any> = {};

  if (updates.enrolledCourses !== undefined) {
    updateExpressions.push('enrolledCourses = :enrolledCourses');
    expressionAttributeValues[':enrolledCourses'] = updates.enrolledCourses;
  }
  // ... builds dynamic UpdateExpression
};
```

**Application**: Can add single course or array of courses (for bundles) using the same function.

#### 4. Event-Driven Architecture

**SNS Topic** (`/home/rico/projects/learnermax-course-app/backend/template.yaml:180-190`, `/home/rico/projects/learnermax-course-app/backend/src/lambdas/post-confirmation.ts:64-80`):

```typescript
await snsClient.send(
  new PublishCommand({
    TopicArn: topicArn,
    Message: JSON.stringify(message),
    MessageAttributes: {
      signUpMethod: {
        DataType: 'String',
        StringValue: message.signUpMethod,
      },
    },
  })
);
```

**Application to Enrollment**: Publish enrollment events with `enrollmentType` attribute. Different consumers handle free vs paid logic.

#### 5. Middleware Pattern

**Route Protection** (`/home/rico/projects/learnermax-course-app/frontend/middleware.ts:1-5`, `/home/rico/projects/learnermax-course-app/frontend/auth.config.ts:8-30`):
```typescript
callbacks: {
  authorized({ auth, request: { nextUrl } }) {
    const isLoggedIn = !!auth?.user;
    const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');

    if (isOnDashboard && !isLoggedIn) return false;
    return true;
  }
}
```

**Application to Course Access**: Add enrollment check middleware:
```typescript
if (nextUrl.pathname.startsWith('/learn')) {
  const courseSlug = nextUrl.pathname.split('/')[2];
  // Optimistic check only - full check in API route
  const enrolled = await checkEnrollmentCache(auth.user.id, courseSlug);
  if (!enrolled) return Response.redirect(`/${courseSlug}`); // SEO-friendly URL
}
```

#### 6. Provider Pattern (React Context)

**Session Provider** (`/home/rico/projects/learnermax-course-app/frontend/components/providers/session-provider.tsx:1-12`, `/home/rico/projects/learnermax-course-app/frontend/app/layout.tsx:31-33`):

```typescript
export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

// Used in root layout
<SessionProvider>
  {children}
</SessionProvider>
```

**Application to Enrollment**: Create `EnrollmentProvider` to track enrollment flow state (selected courses, cart, payment status) across multi-step enrollment.

---

## Proven External Patterns for Course Enrollment

### 1. Strategy Pattern for Enrollment Processing

**Source**: FreeCodeCamp Strategy Pattern Guide

**Pattern**: Define interface for enrollment, implement concrete strategies for each course type.

```typescript
// Strategy Interface
interface EnrollmentStrategy {
  enroll(userId: string, courseId: string): Promise<EnrollmentResult>;
}

// Free Course Strategy
class FreeEnrollmentStrategy implements EnrollmentStrategy {
  async enroll(userId: string, courseId: string) {
    // Direct enrollment, no payment
    return await enrollmentRepository.create({
      userId,
      courseId,
      status: 'active',
      paymentStatus: 'free',
      enrolledAt: new Date().toISOString()
    });
  }
}

// Paid Course Strategy
class PaidEnrollmentStrategy implements EnrollmentStrategy {
  constructor(private stripeService: StripeService) {}

  async enroll(userId: string, courseId: string) {
    // Create Stripe checkout session
    const session = await this.stripeService.createCheckoutSession({
      courseId,
      userId,
      successUrl: `/courses/${courseId}?success=true`,
      cancelUrl: `/courses/${courseId}?canceled=true`
    });

    return {
      status: 'pending',
      checkoutUrl: session.url
    };
  }
}

// Bundle Strategy
class BundleEnrollmentStrategy implements EnrollmentStrategy {
  constructor(private stripeService: StripeService) {}

  async enroll(userId: string, bundleId: string) {
    const bundle = await bundleRepository.get(bundleId);

    const session = await this.stripeService.createCheckoutSession({
      bundleId,
      courseIds: bundle.courseIds,
      userId,
      successUrl: `/bundles/${bundleId}?success=true`,
      cancelUrl: `/bundles/${bundleId}?canceled=true`
    });

    return {
      status: 'pending',
      checkoutUrl: session.url,
      courseCount: bundle.courseIds.length
    };
  }
}

// Context
class EnrollmentService {
  constructor(private strategy: EnrollmentStrategy) {}

  setStrategy(strategy: EnrollmentStrategy) {
    this.strategy = strategy;
  }

  async enrollUser(userId: string, itemId: string) {
    return await this.strategy.enroll(userId, itemId);
  }
}

// Usage in API route
// app/api/enrollments/route.ts
export async function POST(request: Request) {
  const { userId, itemId, itemType } = await request.json();

  const item = await getItemById(itemId, itemType);
  let strategy: EnrollmentStrategy;

  switch (item.pricingModel) {
    case 'free':
      strategy = new FreeEnrollmentStrategy();
      break;
    case 'paid':
      strategy = new PaidEnrollmentStrategy(stripeService);
      break;
    case 'bundle':
      strategy = new BundleEnrollmentStrategy(stripeService);
      break;
  }

  const enrollmentService = new EnrollmentService(strategy);
  const result = await enrollmentService.enrollUser(userId, itemId);

  return Response.json(result);
}
```

**Why This Pattern**:
- Open/Closed Principle: Add new enrollment types without modifying existing code
- Single Responsibility: Each strategy handles one enrollment type
- Easy to test: Mock individual strategies
- Matches existing Factory pattern usage in codebase

**Integration with Existing Code**: Can be used in backend Express route handlers, similar to how `updateStudent()` is called in `/home/rico/projects/learnermax-course-app/backend/src/routes/students.ts:92-123`.

### 2. DynamoDB Single-Table Design (Adjacency List)

**Source**: AWS re:Post - DynamoDB Single-Table Design

**Pattern**: Store multiple entity types in one table with generic PK/SK, enable bidirectional queries with GSI.

```typescript
// Table: Education
// PK: Partition Key | SK: Sort Key
// GSI1PK: Global Secondary Index PK | GSI1SK: Global Secondary Index SK

// Student metadata
{
  PK: 'USER#user123',
  SK: 'METADATA',
  GSI1PK: 'USER#user123',
  GSI1SK: 'METADATA',
  entityType: 'USER',
  name: 'John Doe',
  email: 'john@example.com',
  signUpMethod: 'email',
  createdAt: '2025-01-15T10:00:00Z'
}

// Course metadata
{
  PK: 'COURSE#course456',
  SK: 'METADATA',
  GSI1PK: 'COURSE#course456',
  GSI1SK: 'METADATA',
  entityType: 'COURSE',
  name: 'Advanced TypeScript',
  instructor: 'Jane Smith',
  pricingModel: 'paid',
  price: 99.00
}

// Enrollment record (many-to-many relationship)
{
  PK: 'USER#user123',
  SK: 'COURSE#course456',
  GSI1PK: 'COURSE#course456',
  GSI1SK: 'USER#user123',
  entityType: 'ENROLLMENT',
  enrollmentType: 'paid',
  enrolledAt: '2025-01-20T14:30:00Z',
  paymentStatus: 'completed',
  stripeSessionId: 'cs_test_abc123',
  progress: 45,
  completed: false
}

// Bundle enrollment (single payment, multiple courses)
{
  PK: 'USER#user123',
  SK: 'BUNDLE#bundle789',
  GSI1PK: 'BUNDLE#bundle789',
  GSI1SK: 'USER#user123',
  entityType: 'BUNDLE_ENROLLMENT',
  bundleId: 'bundle789',
  courseIds: ['course456', 'course457', 'course458'],
  enrollmentType: 'bundle',
  enrolledAt: '2025-01-20T14:30:00Z',
  paymentStatus: 'completed',
  stripeSessionId: 'cs_test_xyz789',
  amountPaid: 249.00
}

// Individual course access (from bundle)
{
  PK: 'USER#user123',
  SK: 'COURSE#course456#BUNDLE#bundle789',
  GSI1PK: 'COURSE#course456',
  GSI1SK: 'USER#user123',
  entityType: 'COURSE_ACCESS',
  sourceType: 'bundle',
  bundleId: 'bundle789',
  progress: 45,
  completed: false
}
```

**Query Patterns**:

```typescript
class EnrollmentRepository {
  // Get all enrollments for a user
  async getUserEnrollments(userId: string) {
    return await dynamodb.query({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'COURSE#'
      }
    });
  }

  // Get all students in a course (use GSI)
  async getCourseEnrollments(courseId: string) {
    return await dynamodb.query({
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `COURSE#${courseId}`,
        ':sk': 'USER#'
      }
    });
  }

  // Check specific enrollment
  async getEnrollment(userId: string, courseId: string) {
    return await dynamodb.get({
      Key: {
        PK: `USER#${userId}`,
        SK: `COURSE#${courseId}`
      }
    });
  }

  // Get user profile with all enrollments in single query
  async getUserProfile(userId: string) {
    const result = await dynamodb.query({
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`
      }
    });

    return {
      user: result.Items.find(i => i.SK === 'METADATA'),
      enrollments: result.Items.filter(i => i.entityType === 'ENROLLMENT'),
      bundles: result.Items.filter(i => i.entityType === 'BUNDLE_ENROLLMENT')
    };
  }
}
```

**Benefits**:
- Single DynamoDB table for all entities (reduces costs)
- Bidirectional queries via GSI (courses by user, users by course)
- Atomic operations for enrollment + payment status updates
- Efficient batch operations
- Supports complex relationships (bundles, prerequisites)

**Migration Path from Current Schema**:
The current `learnermax-students-${Environment}` and `learnermax-courses-${Environment}` tables can coexist during migration. New enrollments use the single-table design while existing student records remain in the dedicated table.

### 3. Stripe Payment Integration Pattern

**Source**: Vercel + Stripe Next.js Guide, Stripe Official Docs

**Architecture**:

```typescript
// 1. Frontend: Initiate checkout
// app/actions/enrollment.ts
'use server';

export async function createCheckoutSession(courseId: string) {
  const session = await auth();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${process.env.API_URL}/api/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAccessToken()}`
    },
    body: JSON.stringify({
      courseId,
      userId: session.user.id
    })
  });

  const { sessionId } = await response.json();
  return sessionId;
}

// 2. Backend: Create Stripe session
// backend/src/routes/checkout.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

router.post('/checkout', async (req, res) => {
  const { courseId, userId } = req.body;
  const course = await courseRepository.get(courseId);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: course.name,
          description: course.description,
          images: [course.imageUrl]
        },
        unit_amount: course.price * 100 // Convert to cents
      },
      quantity: 1
    }],
    metadata: {
      courseId,
      userId,
      enrollmentType: 'paid'
    },
    customer_email: req.user.email,
    success_url: `${process.env.FRONTEND_URL}/courses/${courseId}?success=true`,
    cancel_url: `${process.env.FRONTEND_URL}/courses/${courseId}?canceled=true`
  });

  res.json({ sessionId: session.id });
});

// 3. Frontend: Redirect to Stripe
// components/enrollment/EnrollButton.tsx
'use client';

import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/app/actions/enrollment';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function EnrollButton({ courseId }: { courseId: string }) {
  const handleEnroll = async () => {
    const stripe = await stripePromise;
    const sessionId = await createCheckoutSession(courseId);

    await stripe?.redirectToCheckout({ sessionId });
  };

  return <button onClick={handleEnroll}>Enroll Now - $99</button>;
}

// 4. Backend: Webhook handler (CRITICAL for enrollment)
// backend/src/routes/webhooks.ts
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Return 200 immediately (important for Stripe retry logic)
  res.json({ received: true });

  // Process event async
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // Extract metadata
      const { courseId, userId, enrollmentType } = session.metadata!;

      // Enroll user in course
      await enrollmentRepository.create({
        userId,
        courseId,
        enrollmentType: enrollmentType as 'paid',
        enrolledAt: new Date().toISOString(),
        paymentStatus: 'completed',
        stripeSessionId: session.id,
        amountPaid: session.amount_total! / 100,
        progress: 0,
        completed: false
      });

      // Update student enrolledCourses array (for backward compatibility)
      const student = await studentRepository.get(userId);
      await studentRepository.update(userId, {
        enrolledCourses: [...student.enrolledCourses, courseId]
      });

      // Send confirmation email
      await emailService.sendEnrollmentConfirmation({
        userId,
        courseId,
        courseName: session.metadata!.courseName
      });

      logger.info('Enrollment completed', { userId, courseId });
      break;
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { courseId, userId } = session.metadata!;

      // Track abandoned cart
      await abandonedCartRepository.create({
        userId,
        courseId,
        abandonedAt: new Date().toISOString(),
        stripeSessionId: session.id,
        emailsSent: 0
      });

      logger.info('Checkout session expired', { userId, courseId });
      break;
    }
  }
});
```

**Webhook Best Practices** (from Stripe Docs):
- Return 200 status immediately (within 5 seconds)
- Process event asynchronously
- Verify signature on every webhook
- Use `event.id` for idempotency (prevent duplicate processing)
- Fetch latest data from Stripe API, don't trust event payload alone
- Handle retries gracefully (Stripe retries for 3 days)

**Security Considerations**:
- Never trust client-side price data
- Always fetch course price from database in backend
- Verify webhook signature using `stripe.webhooks.constructEvent()`
- Use environment-specific webhook secrets (preview vs prod)

### 4. Abandoned Cart Recovery Pattern

**Source**: Klaviyo Abandoned Cart Benchmarks, Rejoiner Statistics

**Email Sequence Timing**:

```typescript
interface AbandonedCartSequence {
  email1: {
    timing: '30-60 minutes after abandonment',
    conversionRate: 'Highest (3-5%)',
    subject: 'Complete your enrollment in [Course Name]',
    content: {
      heading: 'You left something behind',
      courseImage: true,
      progressBar: '80% complete',
      benefits: ['Lifetime access', 'Certificate', '30-day guarantee'],
      cta: 'Complete Enrollment',
      ctaLink: 'Pre-filled checkout URL'
    }
  },
  email2: {
    timing: '12 hours after abandonment',
    conversionRate: 'Medium (1-2%)',
    subject: '[Course Name] - Join 10,000+ students',
    content: {
      heading: 'Still thinking about it?',
      socialProof: true,
      testimonials: [
        { name: 'Sarah J.', quote: 'Changed my career!', rating: 5 }
      ],
      stats: '10,000+ students, 4.8 rating',
      cta: 'Enroll Now',
      ctaLink: 'Checkout URL'
    }
  },
  email3: {
    timing: '24-72 hours after abandonment',
    conversionRate: 'Low (0.5-1%)',
    subject: 'Last chance: [Course Name] enrollment',
    content: {
      heading: 'This is your last reminder',
      urgency: 'Optional: Limited-time offer expires in 24h',
      incentive: 'Optional: 10% discount code (use sparingly)',
      faq: 'Address common objections',
      cta: 'Enroll Now',
      ctaLink: 'Checkout URL with discount code'
    }
  }
}
```

**Implementation**:

```typescript
// backend/src/models/abandoned-cart.ts
interface AbandonedCart {
  userId: string;
  courseId: string;
  abandonedAt: string;
  checkoutUrl: string;
  emailsSent: number;
  recovered: boolean;
  stripeSessionId?: string;
}

// backend/src/services/abandoned-cart.service.ts
export class AbandonedCartService {
  async trackAbandonment(cart: AbandonedCart) {
    // Create record
    await abandonedCartRepository.create(cart);

    // Schedule email sequence using SNS + Lambda
    await this.scheduleEmail({
      userId: cart.userId,
      template: 'abandoned-cart-1',
      sendAt: addMinutes(new Date(cart.abandonedAt), 30),
      data: {
        courseId: cart.courseId,
        checkoutUrl: cart.checkoutUrl
      }
    });

    await this.scheduleEmail({
      userId: cart.userId,
      template: 'abandoned-cart-2',
      sendAt: addHours(new Date(cart.abandonedAt), 12),
      data: {
        courseId: cart.courseId,
        checkoutUrl: cart.checkoutUrl
      }
    });

    await this.scheduleEmail({
      userId: cart.userId,
      template: 'abandoned-cart-3',
      sendAt: addHours(new Date(cart.abandonedAt), 24),
      data: {
        courseId: cart.courseId,
        checkoutUrl: cart.checkoutUrl
      }
    });
  }

  async markRecovered(userId: string, courseId: string) {
    await abandonedCartRepository.update(userId, courseId, {
      recovered: true,
      recoveredAt: new Date().toISOString()
    });
  }

  private async scheduleEmail(params: EmailScheduleParams) {
    // Use AWS EventBridge Scheduler or SNS delayed messages
    await eventBridge.putEvent({
      Time: params.sendAt,
      EventBusName: 'default',
      Source: 'learnermax.email',
      DetailType: 'SendEmail',
      Detail: JSON.stringify(params)
    });
  }
}

// Trigger from webhook
// backend/src/routes/webhooks.ts
case 'checkout.session.expired': {
  const session = event.data.object as Stripe.Checkout.Session;
  const { courseId, userId } = session.metadata!;

  await abandonedCartService.trackAbandonment({
    userId,
    courseId,
    abandonedAt: new Date().toISOString(),
    checkoutUrl: session.url,
    emailsSent: 0,
    recovered: false,
    stripeSessionId: session.id
  });
  break;
}

case 'checkout.session.completed': {
  // Mark cart as recovered if it was abandoned
  const { courseId, userId } = session.metadata!;
  await abandonedCartService.markRecovered(userId, courseId);
  break;
}
```

**Key Statistics** (from research):
- Average cart abandonment rate: **79.17%** for online courses
- Recovery rate with 3-email sequence: **10-15%** (respectable), **40-50%** (excellent)
- Open rate for abandoned cart emails: **41.18%** (vs 21% for marketing emails)
- Revenue per recipient: **$5.81** average, **$28.89** for top 10%

**Best Practices**:
- Send first email within 1 hour (highest conversion window)
- Use customer's email from Stripe session
- Include direct checkout link (pre-filled cart)
- Show course image and benefits
- Add social proof (testimonials, student count)
- Use urgency sparingly (can reduce trust)
- Stop emails after recovery
- A/B test subject lines and timing

### 5. Simple Course Recommendation Pattern

**Note**: This is a simple course platform (not for 100s of courses), so we avoid complex ML-based recommendations.

**Simple Recommendation Approach**:

```typescript
// Simple recommendation service
class RecommendationService {
  // Show next course in the same series (if defined)
  async getNextInSeries(courseId: string): Promise<Course | null> {
    const course = await courseRepository.get(courseId);

    if (course.nextCourseId) {
      return await courseRepository.get(course.nextCourseId);
    }

    return null;
  }

  // Show other courses by the same instructor
  async getSameInstructor(courseId: string): Promise<Course[]> {
    const course = await courseRepository.get(courseId);

    return await courseRepository.query({
      instructor: course.instructor,
      excludeIds: [courseId]
    });
  }

  // Show manually curated "related courses"
  async getRelatedCourses(courseId: string): Promise<Course[]> {
    const course = await courseRepository.get(courseId);

    if (course.relatedCourseIds && course.relatedCourseIds.length > 0) {
      return await Promise.all(
        course.relatedCourseIds.map(id => courseRepository.get(id))
      );
    }

    return [];
  }

  // Show popular courses (enrollment count)
  async getPopularCourses(limit: number = 5): Promise<Course[]> {
    return await courseRepository.getAll()
      .then(courses =>
        courses
          .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
          .slice(0, limit)
      );
  }

  // Combined simple recommendations
  async getRecommendations(userId: string, currentCourseId?: string): Promise<Course[]> {
    const recommendations: Course[] = [];

    // 1. If viewing a course, check for next in series
    if (currentCourseId) {
      const nextInSeries = await this.getNextInSeries(currentCourseId);
      if (nextInSeries) recommendations.push(nextInSeries);

      // 2. Show related courses (manually curated)
      const related = await this.getRelatedCourses(currentCourseId);
      recommendations.push(...related);

      // 3. Show other courses by same instructor
      const sameInstructor = await this.getSameInstructor(currentCourseId);
      recommendations.push(...sameInstructor.slice(0, 2));
    }

    // 4. Fill remaining slots with popular courses
    if (recommendations.length < 5) {
      const popular = await this.getPopularCourses(5 - recommendations.length);
      recommendations.push(...popular);
    }

    // Remove duplicates and return max 5
    const uniqueCourses = Array.from(
      new Map(recommendations.map(c => [c.id, c])).values()
    );

    return uniqueCourses.slice(0, 5);
  }
}

// Usage in API route
// backend/src/routes/recommendations.ts
router.get('/recommendations', async (req, res) => {
  const userId = getUserIdFromContext(req);
  const { courseId } = req.query;

  const recommendations = await recommendationService.getRecommendations(
    userId,
    courseId as string | undefined
  );

  res.json({ recommendations });
});
```

**When to Show Recommendations**:
1. **Dashboard**: "Popular Courses" section
2. **Course Completion**: "Next in Series" or "Related Courses" modal
3. **Course Detail Page**: "You May Also Like" section (same instructor + related)
4. **Browse Page**: "Popular Courses" list

**Course Model with Recommendation Fields**:
```typescript
interface Course {
  id: string;
  slug: string; // SEO-friendly URL slug
  name: string;
  instructor: string;
  enrollmentCount: number; // Track for popularity
  nextCourseId?: string; // Next course in series
  relatedCourseIds?: string[]; // Manually curated related courses
  // ... other fields
}
```

### 6. Feature-Based Backend Architecture

**Source**: DEV Community - Express.js Design Patterns

**Recommended Structure** for enrollment scenarios:

```
backend/
├── src/
│   ├── features/
│   │   ├── enrollment/
│   │   │   ├── enrollment.controller.ts
│   │   │   ├── enrollment.service.ts
│   │   │   ├── enrollment.repository.ts
│   │   │   ├── enrollment.routes.ts
│   │   │   ├── enrollment.types.ts
│   │   │   └── strategies/
│   │   │       ├── free-enrollment.strategy.ts
│   │   │       ├── paid-enrollment.strategy.ts
│   │   │       └── bundle-enrollment.strategy.ts
│   │   ├── courses/
│   │   │   ├── course.controller.ts
│   │   │   ├── course.service.ts
│   │   │   ├── course.repository.ts
│   │   │   ├── course.routes.ts
│   │   │   ├── course.types.ts
│   │   │   └── recommendations.service.ts  # Simple recommendations
│   │   ├── payments/
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── providers/
│   │   │   │   ├── payment-provider.interface.ts
│   │   │   │   ├── stripe.provider.ts
│   │   │   │   └── paddle.provider.ts  # For future swapping
│   │   │   ├── webhook.handler.ts
│   │   │   └── payment.routes.ts
│   │   └── abandoned-carts/  # Future feature
│   │       ├── abandoned-cart.service.ts
│   │       ├── abandoned-cart.repository.ts
│   │       └── email-scheduler.ts
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── enrollment-check.middleware.ts
│   │   ├── utils/
│   │   │   ├── dynamodb.ts
│   │   │   ├── logger.ts
│   │   │   └── metrics.ts
│   │   └── types/
│   │       └── index.ts
│   └── app.ts
```

**Note**: Removed complex ML-based recommendation feature. Using simple recommendation service within courses feature.

**Benefits**:
- Features are self-contained (easy to add/remove)
- Clear boundaries between enrollment types
- Strategy pattern naturally maps to directory structure
- Scales well as platform grows

**Example Feature Registration**:

```typescript
// src/app.ts
import express from 'express';
import enrollmentRoutes from './features/enrollment/enrollment.routes';
import courseRoutes from './features/courses/course.routes';
import paymentRoutes from './features/payments/payment.routes';

const app = express();

// Middleware
app.use(express.json());

// Feature routes
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/courses', courseRoutes);  // Includes recommendations endpoint
app.use('/api/payments', paymentRoutes);

export default app;
```

**Migration from Current Structure**:
The current `/home/rico/projects/learnermax-course-app/backend/src/routes/students.ts` can remain, and new feature folders added alongside. Existing student routes continue to work while new enrollment logic uses the feature-based structure.

**Note**: Remove the `recommendations/` feature folder from the structure above, as we're using a simple recommendation approach without ML.

---

## User Flow Patterns for Each Scenario

### Scenario 1: Single Free Course (Current Focus)

**User Journey**:
```
Landing Page (/)
  ↓
Click "Enroll Now" (passes courseid=course-001)
  ↓
/enroll?courseid=course-001
  ↓
If logged in: Skip to enrollment
If not logged in: Show signup/signin toggle
  ↓
Sign up (email/password or Google OAuth)
  ↓
If email: /verify-email → /signin → Continue
If Google: Continue directly
  ↓
Enrollment confirmation (instant for free courses)
  ↓
Redirect to /dashboard (shows enrolled course)
  ↓
Click course card
  ↓
/learn/course-001 (protected route, checks enrollment)
```

**Implementation Changes Needed**:
1. **Capture courseid during signup** (`EnrollmentForm.tsx:25-50`):
   ```typescript
   const searchParams = useSearchParams();
   const courseId = searchParams.get('courseid') || 'course-001';

   // After successful signup, store courseId in session or pass to next page
   ```

2. **Create enrollment after authentication**:
   ```typescript
   // Option A: Client-side (immediate after signin)
   // app/dashboard/page.tsx
   useEffect(() => {
     const pendingEnrollment = sessionStorage.getItem('pendingEnrollment');
     if (pendingEnrollment) {
       enrollInCourse(pendingEnrollment);
       sessionStorage.removeItem('pendingEnrollment');
     }
   }, []);

   // Option B: Server-side (during PostConfirmation Lambda)
   // backend/src/lambdas/post-confirmation.ts
   // Publish message with courseId if it was passed during signup
   ```

3. **Update dashboard to display enrolled courses**:
   ```typescript
   // components/dashboard/DashboardContent.tsx
   const enrollments = await fetch('/api/enrollments', {
     headers: { Authorization: `Bearer ${accessToken}` }
   });

   return (
     <div>
       <h2>My Courses</h2>
       {enrollments.map(enrollment => (
         <CourseCard key={enrollment.courseId} {...enrollment} />
       ))}
     </div>
   );
   ```

4. **Create protected learn route**:
   ```typescript
   // app/learn/[courseId]/page.tsx
   export default async function LearnPage({ params }: { params: { courseId: string } }) {
     const session = await auth();
     if (!session) redirect('/signin');

     const enrolled = await checkEnrollment(session.user.id, params.courseId);
     if (!enrolled) redirect(`/courses/${params.courseId}`);

     return <CoursePlayer courseId={params.courseId} />;
   }
   ```

**Why Free Course First**:
- Simplest to implement (no payment integration)
- Validates enrollment flow architecture
- Tests protected route access
- Establishes data model and API patterns
- Can add paid courses by switching to PaidEnrollmentStrategy later

### Scenario 2: Multiple Free Courses

**User Journey**:
```
Landing Page (/)
  ↓
Browse Courses (/courses)
  ↓
Click course card
  ↓
Course Detail Page (/:course-slug) - SEO friendly
  ↓
Click "Enroll Now"
  ↓
If logged in: Instant enrollment → Redirect to /dashboard
If not logged in: Redirect to /signin?callbackUrl=/:course-slug/enroll
  ↓
After signin: Auto-enroll → Redirect to /dashboard
  ↓
Dashboard shows all enrolled courses
  ↓
Click any course card → /learn/:course-slug
```

**New Components Needed**:
1. **Course Listing Page**:
   ```typescript
   // app/courses/page.tsx
   export default async function CoursesPage() {
     const courses = await courseRepository.getAll();

     return (
       <div className="grid grid-cols-3 gap-6">
         {courses.map(course => (
           <CourseCard key={course.id} course={course} />
         ))}
       </div>
     );
   }
   ```

2. **Course Detail Page (SEO-friendly URL)**:
   ```typescript
   // app/[courseSlug]/page.tsx
   export default async function CourseDetailPage({ params }) {
     // Get course by slug instead of ID
     const course = await courseRepository.getBySlug(params.courseSlug);
     const session = await auth();

     const enrolled = session
       ? await checkEnrollment(session.user.id, course.id)
       : false;

     return (
       <div>
         <CourseHeader course={course} />
         <CourseMetadata course={course} />

         {enrolled ? (
           <Link href={`/learn/${course.slug}`}>
             <Button>Continue Learning</Button>
           </Link>
         ) : (
           <EnrollButton courseId={course.id} courseSlug={course.slug} />
         )}
       </div>
     );
   }
   ```

   **Course Repository Addition**:
   ```typescript
   // backend/src/features/courses/course.repository.ts
   export const courseRepository = {
     // ... existing methods

     async getBySlug(slug: string): Promise<Course> {
       const result = await dynamodb.query({
         IndexName: 'SlugIndex', // GSI on slug field
         KeyConditionExpression: 'slug = :slug',
         ExpressionAttributeValues: {
           ':slug': slug
         }
       });

       if (!result.Items || result.Items.length === 0) {
         throw new Error(`Course not found: ${slug}`);
       }

       return result.Items[0] as Course;
     }
   };
   ```

**Pattern Extension**:
- Same enrollment flow as single course
- Uses FreeEnrollmentStrategy for all courses
- DynamoDB stores multiple enrollment records (one per course)
- Dashboard queries all user enrollments via PK = USER#userId

### Scenario 3: Paid Single Course

**User Journey**:
```
Landing Page (/) or Course Detail Page
  ↓
Click "Enroll Now - $99"
  ↓
If not logged in: Redirect to /signin?callbackUrl=/courses/:courseId/checkout
  ↓
After signin: /courses/:courseId/checkout
  ↓
Show payment form (Stripe Elements embedded OR redirect to Stripe Checkout)
  ↓
User completes payment
  ↓
Stripe webhook triggers enrollment
  ↓
Success redirect: /courses/:courseId?success=true
  ↓
Show success modal: "You're enrolled! Start learning"
  ↓
Click "Start Learning" → /learn/:courseId
```

**Implementation**:
1. **Checkout Page**:
   ```typescript
   // app/courses/[courseId]/checkout/page.tsx
   export default async function CheckoutPage({ params }) {
     const session = await auth();
     if (!session) redirect(`/signin?callbackUrl=/courses/${params.courseId}/checkout`);

     const course = await courseRepository.get(params.courseId);

     return (
       <div className="max-w-2xl mx-auto">
         <h1>Checkout</h1>
         <CourseCheckoutSummary course={course} />
         <StripeCheckoutButton courseId={course.id} price={course.price} />
       </div>
     );
   }
   ```

2. **Stripe Checkout Button**:
   ```typescript
   // components/checkout/StripeCheckoutButton.tsx
   'use client';

   export function StripeCheckoutButton({ courseId, price }) {
     const handleCheckout = async () => {
       const sessionId = await createCheckoutSession(courseId);
       const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
       await stripe?.redirectToCheckout({ sessionId });
     };

     return (
       <Button onClick={handleCheckout}>
         Complete Purchase - ${price}
       </Button>
     );
   }
   ```

3. **Backend Webhook Handler** (see Stripe Integration Pattern above)

4. **Success Page**:
   ```typescript
   // app/courses/[courseId]/page.tsx
   export default async function CourseDetailPage({ params, searchParams }) {
     if (searchParams.success === 'true') {
       return <EnrollmentSuccessModal courseId={params.courseId} />;
     }

     if (searchParams.canceled === 'true') {
       return <CheckoutCanceledBanner />;
     }

     // Regular course detail page
   }
   ```

**Strategy Switch**:
```typescript
// backend/src/features/enrollment/enrollment.service.ts
const course = await courseRepository.get(courseId);

const strategy = course.pricingModel === 'free'
  ? new FreeEnrollmentStrategy()
  : new PaidEnrollmentStrategy(stripeService);

const result = await strategy.enroll(userId, courseId);
```

**Abandoned Cart**:
Stripe checkout sessions expire after 24 hours. The `checkout.session.expired` webhook triggers abandoned cart email sequence (see Abandoned Cart Pattern above).

### Scenario 4: Multiple Courses (Free + Paid Mix)

**User Journey**:
```
Browse Courses (/courses)
  ↓
Courses display with pricing:
  - Free courses: "Enroll Free" button
  - Paid courses: "Enroll - $99" button
  ↓
Click course card → Course Detail Page
  ↓
Free course: Instant enrollment (if logged in)
Paid course: → Checkout flow
  ↓
Dashboard shows all enrolled courses (free + paid)
```

**Implementation**:
1. **Dynamic Course Card**:
   ```typescript
   // components/courses/CourseCard.tsx
   export function CourseCard({ course }) {
     const enrollButton = course.pricingModel === 'free' ? (
       <EnrollButton courseId={course.id} label="Enroll Free" />
     ) : (
       <Link href={`/courses/${course.id}/checkout`}>
         <Button>Enroll - ${course.price}</Button>
       </Link>
     );

     return (
       <div className="course-card">
         <img src={course.imageUrl} />
         <h3>{course.name}</h3>
         <p>{course.description}</p>
         {enrollButton}
       </div>
     );
   }
   ```

2. **Unified Enrollment API**:
   ```typescript
   // backend/src/features/enrollment/enrollment.controller.ts
   router.post('/', async (req, res) => {
     const { courseId } = req.body;
     const userId = getUserIdFromContext(req);

     const course = await courseRepository.get(courseId);

     let strategy: EnrollmentStrategy;

     if (course.pricingModel === 'free') {
       strategy = new FreeEnrollmentStrategy();
       const result = await strategy.enroll(userId, courseId);
       return res.json(result);
     } else {
       strategy = new PaidEnrollmentStrategy(stripeService);
       const result = await strategy.enroll(userId, courseId);
       return res.json(result); // Returns { checkoutUrl }
     }
   });
   ```

**Data Model**:
```typescript
// All enrollments stored the same way
{
  PK: 'USER#user123',
  SK: 'COURSE#course456',
  entityType: 'ENROLLMENT',
  enrollmentType: 'free' | 'paid',
  paymentStatus: 'free' | 'completed',
  stripeSessionId?: string,
  enrolledAt: string
}
```

### Scenario 5: Course Bundles

**User Journey**:
```
Browse Courses or Bundles (/bundles)
  ↓
Bundle Detail Page (/bundles/:bundleId)
  - Shows all courses in bundle
  - Shows bundle price (discounted from individual)
  ↓
Click "Enroll in Bundle - $249"
  ↓
Checkout flow (single payment)
  ↓
Stripe webhook enrolls user in ALL courses in bundle
  ↓
Dashboard shows all courses from bundle
  ↓
User can access any course in bundle via /learn/:courseId
```

**Implementation**:
1. **Bundle Model**:
   ```typescript
   interface Bundle {
     id: string;
     name: string;
     description: string;
     courseIds: string[];
     price: number;
     discount: number; // percentage off individual prices
   }

   // DynamoDB
   {
     PK: 'BUNDLE#bundle789',
     SK: 'METADATA',
     entityType: 'BUNDLE',
     name: 'Full-Stack Mastery Bundle',
     courseIds: ['course456', 'course457', 'course458'],
     price: 249.00
   }
   ```

2. **Bundle Enrollment Strategy**:
   ```typescript
   class BundleEnrollmentStrategy implements EnrollmentStrategy {
     async enroll(userId: string, bundleId: string) {
       const bundle = await bundleRepository.get(bundleId);

       // Create Stripe checkout with bundle details
       const session = await stripeService.createCheckoutSession({
         mode: 'payment',
         metadata: {
           userId,
           bundleId,
           courseIds: bundle.courseIds.join(','),
           enrollmentType: 'bundle'
         },
         line_items: [{
           price_data: {
             currency: 'usd',
             product_data: {
               name: bundle.name,
               description: `Includes ${bundle.courseIds.length} courses`
             },
             unit_amount: bundle.price * 100
           },
           quantity: 1
         }],
         success_url: `${process.env.FRONTEND_URL}/bundles/${bundleId}?success=true`,
         cancel_url: `${process.env.FRONTEND_URL}/bundles/${bundleId}?canceled=true`
       });

       return {
         status: 'pending',
         checkoutUrl: session.url
       };
     }
   }
   ```

3. **Webhook Handler for Bundle**:
   ```typescript
   case 'checkout.session.completed': {
     const session = event.data.object as Stripe.Checkout.Session;
     const { enrollmentType, bundleId, courseIds } = session.metadata!;

     if (enrollmentType === 'bundle') {
       const courses = courseIds.split(',');

       // Create bundle enrollment record
       await enrollmentRepository.create({
         userId,
         bundleId,
         enrollmentType: 'bundle',
         enrolledAt: new Date().toISOString(),
         paymentStatus: 'completed',
         stripeSessionId: session.id,
         amountPaid: session.amount_total! / 100
       });

       // Create individual course access records
       await Promise.all(
         courses.map(courseId =>
           enrollmentRepository.create({
             userId,
             courseId,
             enrollmentType: 'bundle',
             sourceType: 'bundle',
             bundleId,
             enrolledAt: new Date().toISOString(),
             paymentStatus: 'completed'
           })
         )
       );

       // Update student enrolledCourses array
       const student = await studentRepository.get(userId);
       await studentRepository.update(userId, {
         enrolledCourses: [...student.enrolledCourses, ...courses]
       });
     }
     break;
   }
   ```

4. **Bundle Display**:
   ```typescript
   // app/bundles/[bundleId]/page.tsx
   export default async function BundlePage({ params }) {
     const bundle = await bundleRepository.get(params.bundleId);
     const courses = await Promise.all(
       bundle.courseIds.map(id => courseRepository.get(id))
     );

     const totalPrice = courses.reduce((sum, c) => sum + c.price, 0);
     const savings = totalPrice - bundle.price;

     return (
       <div>
         <h1>{bundle.name}</h1>
         <p>Save ${savings} with this bundle!</p>

         <div className="courses-in-bundle">
           {courses.map(course => (
             <CourseCard key={course.id} course={course} />
           ))}
         </div>

         <div className="pricing">
           <p>Individual Price: <s>${totalPrice}</s></p>
           <p>Bundle Price: ${bundle.price}</p>
         </div>

         <StripeCheckoutButton bundleId={bundle.id} price={bundle.price} />
       </div>
     );
   }
   ```

**Query Patterns**:
```typescript
// Get all courses user has access to (individual + bundle)
async function getUserCourseAccess(userId: string) {
  const enrollments = await dynamodb.query({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'COURSE#'
    }
  });

  return enrollments.Items; // Includes both individual and bundle-based access
}
```

### Scenario 6: Mini Free Course → Paid Course Upsell

**User Journey**:
```
Landing Page
  ↓
Enroll in Free Mini Course (5 lessons)
  ↓
Complete Mini Course
  ↓
Course Completion Modal:
  - "Congratulations!"
  - "Ready for the full course?"
  - Shows full course details + pricing
  - "Upgrade Now" button
  ↓
Click "Upgrade Now" → Checkout flow
  ↓
After payment: Enrolled in full course
```

**Implementation**:
1. **Course Relationship Model**:
   ```typescript
   interface Course {
     id: string;
     name: string;
     pricingModel: 'free' | 'paid';
     price?: number;
     isMiniCourse: boolean;
     fullCourseId?: string; // Reference to paid version
   }

   // DynamoDB
   {
     PK: 'COURSE#course-mini-001',
     SK: 'METADATA',
     entityType: 'COURSE',
     name: 'TypeScript Fundamentals (Free)',
     pricingModel: 'free',
     isMiniCourse: true,
     fullCourseId: 'course-full-001'
   }
   ```

2. **Completion Modal**:
   ```typescript
   // components/learn/CourseCompletionModal.tsx
   export function CourseCompletionModal({ courseId }) {
     const [course, setCourse] = useState<Course>();
     const [fullCourse, setFullCourse] = useState<Course>();

     useEffect(() => {
       async function load() {
         const c = await getCourse(courseId);
         setCourse(c);

         if (c.fullCourseId) {
           const full = await getCourse(c.fullCourseId);
           setFullCourse(full);
         }
       }
       load();
     }, [courseId]);

     if (!course?.fullCourseId) {
       return <StandardCompletionModal />;
     }

     return (
       <Modal>
         <h2>🎉 Congratulations!</h2>
         <p>You've completed {course.name}</p>

         <div className="upsell-section">
           <h3>Ready to master {fullCourse.name}?</h3>
           <ul>
             <li>50+ lessons (vs 5 in mini course)</li>
             <li>Real-world projects</li>
             <li>Certificate of completion</li>
             <li>Lifetime access</li>
           </ul>

           <p className="pricing">
             <span className="label">Special offer:</span>
             <span className="price">${fullCourse.price}</span>
           </p>

           <Link href={`/courses/${fullCourse.id}/checkout`}>
             <Button size="lg">Upgrade Now</Button>
           </Link>

           <button onClick={onClose}>Maybe Later</button>
         </div>
       </Modal>
     );
   }
   ```

3. **Track Completion**:
   ```typescript
   // backend/src/features/enrollment/enrollment.service.ts
   async function markCourseComplete(userId: string, courseId: string) {
     await enrollmentRepository.update(userId, courseId, {
       completed: true,
       completedAt: new Date().toISOString(),
       progress: 100
     });

     // Check if mini course
     const course = await courseRepository.get(courseId);

     if (course.isMiniCourse && course.fullCourseId) {
       // Send upsell email
       await emailService.sendUpsellEmail({
         userId,
         miniCourseName: course.name,
         fullCourseId: course.fullCourseId
       });
     }
   }
   ```

4. **Email Upsell** (24 hours after completion):
   ```typescript
   interface UpsellEmail {
     subject: 'Ready to continue your learning journey?';
     content: {
       greeting: 'Hi [Name],';
       message: 'You completed [Mini Course Name]!';
       cta: 'Continue with the full course and get 20% off';
       discount: 'GRADUATE20';
       expiresIn: '7 days';
     }
   }
   ```

---

## Concrete Implementation Plan for Current Scenario: Free Single Course

### Phase 1: Capture Course ID During Enrollment

**Files to Modify**:

1. **EnrollmentForm Component** (`/home/rico/projects/learnermax-course-app/frontend/components/enrollment/EnrollmentForm.tsx`):
   ```typescript
   // Line 16: Add useSearchParams
   const searchParams = useSearchParams();
   const courseId = searchParams.get('courseid') || 'course-001';

   // Line 44: Pass courseId to verify-email page
   router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&courseid=${courseId}`);
   ```

2. **VerifyEmailForm Component** (`/home/rico/projects/learnermax-course-app/frontend/components/enrollment/VerifyEmailForm.tsx`):
   ```typescript
   // Line 16: Capture courseId
   const courseId = searchParams.get('courseid') || 'course-001';

   // Line 51: Pass courseId to signin page
   router.push(`/signin?callbackUrl=/dashboard&courseid=${courseId}`);
   ```

3. **SignInForm Component** (`/home/rico/projects/learnermax-course-app/frontend/components/auth/SignInForm.tsx`):
   ```typescript
   // Line 16-17: Capture courseId
   const courseId = searchParams.get('courseid');

   // Store in sessionStorage before signin
   if (courseId) {
     sessionStorage.setItem('pendingEnrollment', courseId);
   }
   ```

### Phase 2: Create Enrollment After Authentication

**New Files to Create**:

1. **Enrollment Repository** (`backend/src/features/enrollment/enrollment.repository.ts`):
   ```typescript
   import { docClient } from '@/lib/dynamodb';
   import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

   const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!; // New single table

   export interface Enrollment {
     userId: string;
     courseId: string;
     enrollmentType: 'free' | 'paid' | 'bundle';
     enrolledAt: string;
     paymentStatus: 'free' | 'pending' | 'completed';
     stripeSessionId?: string;
     progress: number;
     completed: boolean;
   }

   export const enrollmentRepository = {
     async create(enrollment: Enrollment) {
       await docClient.send(
         new PutCommand({
           TableName: TABLE_NAME,
           Item: {
             PK: `USER#${enrollment.userId}`,
             SK: `COURSE#${enrollment.courseId}`,
             GSI1PK: `COURSE#${enrollment.courseId}`,
             GSI1SK: `USER#${enrollment.userId}`,
             entityType: 'ENROLLMENT',
             ...enrollment
           },
           ConditionExpression: 'attribute_not_exists(PK)'
         })
       );
     },

     async get(userId: string, courseId: string) {
       const result = await docClient.send(
         new GetCommand({
           TableName: TABLE_NAME,
           Key: {
             PK: `USER#${userId}`,
             SK: `COURSE#${courseId}`
           }
         })
       );
       return result.Item as Enrollment | undefined;
     },

     async getUserEnrollments(userId: string) {
       const result = await docClient.send(
         new QueryCommand({
           TableName: TABLE_NAME,
           KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
           ExpressionAttributeValues: {
             ':pk': `USER#${userId}`,
             ':sk': 'COURSE#'
           }
         })
       );
       return result.Items as Enrollment[];
     }
   };
   ```

2. **Enrollment Service** (`backend/src/features/enrollment/enrollment.service.ts`):
   ```typescript
   import { enrollmentRepository } from './enrollment.repository';
   import { courseRepository } from '@/features/courses/course.repository';
   import { studentRepository } from '@/models/student';
   import { createLogger } from '@/lib/logger';

   const logger = createLogger('EnrollmentService');

   export class EnrollmentService {
     async enrollUser(userId: string, courseId: string) {
       // Check if already enrolled
       const existing = await enrollmentRepository.get(userId, courseId);
       if (existing) {
         logger.info('User already enrolled', { userId, courseId });
         return existing;
       }

       // Get course details
       const course = await courseRepository.get(courseId);

       // For free courses, enroll immediately
       if (course.pricingModel === 'free') {
         const enrollment = {
           userId,
           courseId,
           enrollmentType: 'free' as const,
           enrolledAt: new Date().toISOString(),
           paymentStatus: 'free' as const,
           progress: 0,
           completed: false
         };

         await enrollmentRepository.create(enrollment);

         // Update student enrolledCourses array (backward compatibility)
         const student = await studentRepository.get(userId);
         await studentRepository.update(userId, {
           enrolledCourses: [...student.enrolledCourses, courseId]
         });

         logger.info('User enrolled in free course', { userId, courseId });
         return enrollment;
       }

       // For paid courses, return checkout URL (future)
       throw new Error('Paid courses not yet implemented');
     }

     async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
       const enrollment = await enrollmentRepository.get(userId, courseId);
       return enrollment !== undefined && enrollment.paymentStatus !== 'pending';
     }
   }

   export const enrollmentService = new EnrollmentService();
   ```

3. **Enrollment Routes** (`backend/src/features/enrollment/enrollment.routes.ts`):
   ```typescript
   import express from 'express';
   import { enrollmentService } from './enrollment.service';
   import { getUserIdFromContext } from '@/shared/utils/auth';
   import { createLogger } from '@/lib/logger';

   const router = express.Router();
   const logger = createLogger('EnrollmentRoutes');

   // POST /api/enrollments
   router.post('/', async (req, res) => {
     try {
       const userId = getUserIdFromContext(req);
       const { courseId } = req.body;

       if (!courseId) {
         return res.status(400).json({ error: 'courseId is required' });
       }

       const enrollment = await enrollmentService.enrollUser(userId, courseId);

       res.status(201).json(enrollment);
     } catch (error) {
       logger.error('Enrollment failed', { error });
       res.status(500).json({ error: 'Failed to enroll' });
     }
   });

   // GET /api/enrollments
   router.get('/', async (req, res) => {
     try {
       const userId = getUserIdFromContext(req);
       const enrollments = await enrollmentRepository.getUserEnrollments(userId);

       res.json(enrollments);
     } catch (error) {
       logger.error('Failed to get enrollments', { error });
       res.status(500).json({ error: 'Failed to get enrollments' });
     }
   });

   // GET /api/enrollments/check/:courseId
   router.get('/check/:courseId', async (req, res) => {
     try {
       const userId = getUserIdFromContext(req);
       const { courseId } = req.params;

       const enrolled = await enrollmentService.checkEnrollment(userId, courseId);

       res.json({ enrolled });
     } catch (error) {
       logger.error('Failed to check enrollment', { error });
       res.status(500).json({ error: 'Failed to check enrollment' });
     }
   });

   export default router;
   ```

4. **Register Routes** (`backend/src/app.ts`):
   ```typescript
   // Add after line 26
   import enrollmentRoutes from './features/enrollment/enrollment.routes';

   // Add after line 33 (after students routes)
   app.use('/api/enrollments', enrollmentRoutes);
   ```

### Phase 3: Frontend Enrollment Flow

**New Files to Create**:

1. **Enrollment Actions** (`frontend/app/actions/enrollment.ts`):
   ```typescript
   'use server';

   import { auth } from '@/lib/auth';
   import { getAccessToken } from './auth';

   export async function enrollInCourse(courseId: string) {
     const session = await auth();
     if (!session) throw new Error('Not authenticated');

     const accessToken = await getAccessToken();

     const response = await fetch(`${process.env.API_URL}/api/enrollments`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${accessToken}`
       },
       body: JSON.stringify({ courseId })
     });

     if (!response.ok) {
       throw new Error('Failed to enroll');
     }

     return await response.json();
   }

   export async function getMyEnrollments() {
     const session = await auth();
     if (!session) return [];

     const accessToken = await getAccessToken();

     const response = await fetch(`${process.env.API_URL}/api/enrollments`, {
       headers: {
         'Authorization': `Bearer ${accessToken}`
       }
     });

     if (!response.ok) {
       return [];
     }

     return await response.json();
   }
   ```

2. **Update Dashboard** (`frontend/components/dashboard/DashboardContent.tsx`):
   ```typescript
   // Replace lines 75-119 (placeholder cards) with:
   import { getMyEnrollments } from '@/app/actions/enrollment';

   export default async function DashboardContent({ session }: DashboardContentProps) {
     const enrollments = await getMyEnrollments();

     return (
       <div className="min-h-screen bg-background">
         <div className="container mx-auto py-8 px-4">
           <div className="flex justify-between items-center mb-8">
             <div>
               <h1 className="text-3xl font-bold">Welcome back, {session.user.name}!</h1>
               <p className="text-muted-foreground">Continue your learning journey</p>
             </div>
             <SignOutButton />
           </div>

           {enrollments.length === 0 ? (
             <div className="text-center py-12">
               <p className="text-muted-foreground mb-4">You're not enrolled in any courses yet</p>
               <Link href="/courses">
                 <Button>Browse Courses</Button>
               </Link>
             </div>
           ) : (
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {enrollments.map((enrollment) => (
                 <EnrollmentCard key={enrollment.courseId} enrollment={enrollment} />
               ))}
             </div>
           )}
         </div>
       </div>
     );
   }
   ```

3. **Enrollment Card Component** (`frontend/components/dashboard/EnrollmentCard.tsx`):
   ```typescript
   import Link from 'next/link';
   import { Button } from '@/components/ui/button';
   import { Progress } from '@/components/ui/progress';

   interface EnrollmentCardProps {
     enrollment: {
       courseId: string;
       enrolledAt: string;
       progress: number;
       completed: boolean;
     };
   }

   export async function EnrollmentCard({ enrollment }: EnrollmentCardProps) {
     // Fetch course details
     const course = await getCourse(enrollment.courseId);

     return (
       <div className="border rounded-lg p-6 hover:shadow-lg transition">
         <img src={course.imageUrl} alt={course.name} className="w-full h-48 object-cover rounded-md mb-4" />

         <h3 className="text-xl font-semibold mb-2">{course.name}</h3>
         <p className="text-sm text-muted-foreground mb-4">{course.instructor}</p>

         <div className="mb-4">
           <div className="flex justify-between text-sm mb-2">
             <span>Progress</span>
             <span>{enrollment.progress}%</span>
           </div>
           <Progress value={enrollment.progress} />
         </div>

         <Link href={`/learn/${enrollment.courseId}`}>
           <Button className="w-full">
             {enrollment.completed ? 'Review Course' : 'Continue Learning'}
           </Button>
         </Link>
       </div>
     );
   }
   ```

4. **Client-Side Enrollment Hook** (`frontend/app/dashboard/page.tsx`):
   ```typescript
   // Add useEffect to handle pending enrollment
   'use client';

   import { useEffect } from 'react';
   import { enrollInCourse } from '@/app/actions/enrollment';

   export default function DashboardPage() {
     useEffect(() => {
       const pendingEnrollment = sessionStorage.getItem('pendingEnrollment');

       if (pendingEnrollment) {
         enrollInCourse(pendingEnrollment)
           .then(() => {
             sessionStorage.removeItem('pendingEnrollment');
             window.location.reload(); // Refresh to show new enrollment
           })
           .catch(error => {
             console.error('Failed to enroll:', error);
           });
       }
     }, []);

     return <DashboardContent />;
   }
   ```

### Phase 4: Protected Course Access

**New Files to Create**:

1. **Learn Page** (`frontend/app/learn/[courseId]/page.tsx`):
   ```typescript
   import { auth } from '@/lib/auth';
   import { redirect } from 'next/navigation';
   import { checkEnrollment } from '@/app/actions/enrollment';
   import { CoursePlayer } from '@/components/learn/CoursePlayer';

   export default async function LearnPage({ params }: { params: { courseId: string } }) {
     const session = await auth();

     if (!session) {
       redirect(`/signin?callbackUrl=/learn/${params.courseId}`);
     }

     const enrolled = await checkEnrollment(params.courseId);

     if (!enrolled) {
       redirect(`/courses/${params.courseId}`);
     }

     return <CoursePlayer courseId={params.courseId} />;
   }
   ```

2. **Check Enrollment Action** (`frontend/app/actions/enrollment.ts`):
   ```typescript
   export async function checkEnrollment(courseId: string): Promise<boolean> {
     const session = await auth();
     if (!session) return false;

     const accessToken = await getAccessToken();

     const response = await fetch(
       `${process.env.API_URL}/api/enrollments/check/${courseId}`,
       {
         headers: {
           'Authorization': `Bearer ${accessToken}`
         }
       }
     );

     if (!response.ok) return false;

     const { enrolled } = await response.json();
     return enrolled;
   }
   ```

3. **Course Player Component** (`frontend/components/learn/CoursePlayer.tsx`):
   ```typescript
   'use client';

   import { useState, useEffect } from 'react';
   import { Button } from '@/components/ui/button';
   import { Progress } from '@/components/ui/progress';

   interface CoursePlayerProps {
     courseId: string;
   }

   export function CoursePlayer({ courseId }: CoursePlayerProps) {
     const [course, setCourse] = useState<Course | null>(null);
     const [currentLesson, setCurrentLesson] = useState(0);

     useEffect(() => {
       async function loadCourse() {
         const data = await getCourse(courseId);
         setCourse(data);
       }
       loadCourse();
     }, [courseId]);

     if (!course) return <div>Loading...</div>;

     const totalLessons = course.curriculum.reduce((sum, module) => sum + module.topics.length, 0);
     const progress = (currentLesson / totalLessons) * 100;

     return (
       <div className="min-h-screen bg-background">
         <div className="container mx-auto py-8 px-4">
           <div className="mb-6">
             <h1 className="text-3xl font-bold mb-2">{course.name}</h1>
             <Progress value={progress} className="mb-2" />
             <p className="text-sm text-muted-foreground">
               {currentLesson} of {totalLessons} lessons completed
             </p>
           </div>

           <div className="grid grid-cols-3 gap-6">
             <div className="col-span-2">
               <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                 <p className="text-muted-foreground">Video Player Placeholder</p>
               </div>

               <div className="flex justify-between">
                 <Button onClick={() => setCurrentLesson(prev => Math.max(0, prev - 1))}>
                   Previous Lesson
                 </Button>
                 <Button onClick={() => setCurrentLesson(prev => Math.min(totalLessons - 1, prev + 1))}>
                   Next Lesson
                 </Button>
               </div>
             </div>

             <div className="col-span-1">
               <h2 className="text-xl font-semibold mb-4">Course Curriculum</h2>
               {course.curriculum.map((module, idx) => (
                 <div key={idx} className="mb-4">
                   <h3 className="font-medium mb-2">{module.module}</h3>
                   <ul className="space-y-1">
                     {module.topics.map((topic, topicIdx) => (
                       <li key={topicIdx} className="text-sm text-muted-foreground pl-4">
                         {topic}
                       </li>
                     ))}
                   </ul>
                 </div>
               ))}
             </div>
           </div>
         </div>
       </div>
     );
   }
   ```

### Phase 5: Middleware Enhancement

**File to Modify**:

1. **Auth Config** (`frontend/auth.config.ts`):
   ```typescript
   // Add after line 27 (after dashboard protection)

   // Protect learn routes
   if (nextUrl.pathname.startsWith('/learn')) {
     if (!isLoggedIn) return false;

     // Note: Enrollment check done in page component, not middleware
     // Middleware is for authentication only
     return true;
   }
   ```

### Infrastructure Changes Needed

1. **New DynamoDB Table** (`backend/template.yaml`):
   ```yaml
   # Add after line 178 (after CoursesTable)
   EducationTable:
     Type: AWS::DynamoDB::Table
     Properties:
       TableName: !Sub learnermax-education-${Environment}
       BillingMode: PAY_PER_REQUEST
       AttributeDefinitions:
         - AttributeName: PK
           AttributeType: S
         - AttributeName: SK
           AttributeType: S
         - AttributeName: GSI1PK
           AttributeType: S
         - AttributeName: GSI1SK
           AttributeType: S
       KeySchema:
         - AttributeName: PK
           KeyType: HASH
         - AttributeName: SK
           KeyType: RANGE
       GlobalSecondaryIndexes:
         - IndexName: GSI1
           KeySchema:
             - AttributeName: GSI1PK
               KeyType: HASH
             - AttributeName: GSI1SK
               KeyType: RANGE
           Projection:
             ProjectionType: ALL
       StreamSpecification:
         StreamViewType: NEW_AND_OLD_IMAGES
   ```

2. **Update Lambda Permissions** (`backend/template.yaml`):
   ```yaml
   # Add to ExpressApiFunction environment variables (around line 330)
   EDUCATION_TABLE_NAME: !Ref EducationTable

   # Add to ExpressApiFunction policies (around line 344)
   - DynamoDBCrudPolicy:
       TableName: !Ref EducationTable
   ```

### Testing Checklist

**Manual Testing Flow**:
1. Navigate to landing page (`/`)
2. Click "Enroll Now" button
3. Verify URL contains `?courseid=course-001`
4. Sign up with new email
5. Verify email with code
6. Sign in
7. Check dashboard shows enrolled course
8. Click course card
9. Verify redirected to `/learn/course-001`
10. Verify course player displays

**API Testing**:
```bash
# 1. Create enrollment
curl -X POST http://localhost:8080/api/enrollments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"courseId": "course-001"}'

# 2. Get user enrollments
curl http://localhost:8080/api/enrollments \
  -H "Authorization: Bearer <token>"

# 3. Check specific enrollment
curl http://localhost:8080/api/enrollments/check/course-001 \
  -H "Authorization: Bearer <token>"
```

**E2E Test** (`e2e/ui/enrollment-flow.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test('complete free course enrollment flow', async ({ page }) => {
  // 1. Start at landing page
  await page.goto('/');

  // 2. Click enroll button
  await page.click('text=Enroll Now');

  // 3. Verify URL contains courseid
  await expect(page).toHaveURL(/courseid=course-001/);

  // 4. Sign up
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');

  // 5. Verify email (mock in test)
  await expect(page).toHaveURL(/verify-email/);
  await page.fill('input[name="code"]', '123456');
  await page.click('button[type="submit"]');

  // 6. Sign in
  await expect(page).toHaveURL(/signin/);
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');

  // 7. Verify dashboard shows course
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Master Modern Web Development')).toBeVisible();

  // 8. Click course card
  await page.click('text=Continue Learning');

  // 9. Verify course player loads
  await expect(page).toHaveURL(/\/learn\/course-001/);
  await expect(page.locator('text=Course Curriculum')).toBeVisible();
});
```

---

## Feature Requirements & Priorities

Based on clarifications, here are the confirmed requirements and their priorities:

### Immediate Priority (Current Sprint)
1. **Free single course enrollment** - MVP to validate architecture
2. **SEO-friendly course URLs** - Use slugs instead of IDs (e.g., `/advanced-typescript` instead of `/courses/course-001`)
3. **Protected course player** - `/learn/:course-slug` requires enrollment

### Future Features (Not Needed Now)
1. **Course Content Storage**: AWS CloudFront + S3 with signed URLs for protection
2. **Payment Provider**: Stripe (use Strategy pattern for easy swapping if needed)
3. **Email Service**: AWS SES for transactional emails
4. **Analytics**: Track time spent per lesson, completion rates
5. **Certificates**: Generate PDF certificates on course completion
6. **Content Protection**: No DRM or watermarking needed
7. **Refund Policy**: Automatic refunds within 30 days
8. **Multi-currency**: Not needed (USD only)
9. **Course Prerequisites**: Not enforced programmatically
10. **Subscription Model**: Yes, monthly/yearly subscriptions for all-access

### Architecture Implications

**For Stripe Integration**:
- Use Strategy pattern to abstract payment provider
- Interface: `PaymentProvider` with implementations: `StripeProvider`, `PaddleProvider`, etc.
- Easy to swap later if needed

**For Course Storage**:
```typescript
interface CourseContentProvider {
  getSignedUrl(courseId: string, lessonId: string, userId: string): Promise<string>;
}

class CloudFrontProvider implements CourseContentProvider {
  async getSignedUrl(courseId: string, lessonId: string, userId: string) {
    // Generate CloudFront signed URL with expiration
    // Verify user enrollment before generating URL
    const enrolled = await enrollmentRepository.get(userId, courseId);
    if (!enrolled) throw new Error('Not enrolled');

    // Generate signed URL valid for 4 hours
    return cloudFront.getSignedUrl({
      url: `https://cdn.learnermax.com/${courseId}/${lessonId}.mp4`,
      expiration: Date.now() + 4 * 60 * 60 * 1000
    });
  }
}
```

**For Slug-Based Routing**:
- Course model includes `slug` field (unique, indexed)
- Public pages use `/:course-slug` (e.g., `/advanced-typescript`)
- Protected pages use `/learn/:course-slug` (e.g., `/learn/advanced-typescript`)
- API internally converts slug → courseId for database operations

---

## Code References

### Current Implementation
- Authentication flow: `frontend/lib/auth.ts:28-93`, `backend/src/lambdas/post-confirmation.ts:26-110`
- Student model: `backend/src/models/student.ts:6-14`, `backend/src/routes/students.ts`
- Enrollment form: `frontend/components/enrollment/EnrollmentForm.tsx:25-50`
- Dashboard: `frontend/components/dashboard/DashboardContent.tsx:15-136`
- Middleware: `frontend/middleware.ts:1-5`, `frontend/auth.config.ts:8-30`

### Existing Patterns
- Factory: `backend/src/lib/logger.ts:3-8`, `backend/src/lib/metrics.ts:3-10`
- Configuration: `backend/src/lambdas/post-confirmation.ts:44-54`
- Dynamic Updates: `backend/src/models/student.ts:63-101`
- Event-Driven: `backend/template.yaml:180-190`, `backend/src/lambdas/post-confirmation.ts:64-80`
- Middleware: `frontend/auth.config.ts:8-30`

### External Resources
- Stripe Integration: [Vercel + Stripe Guide](https://vercel.com/guides/getting-started-with-nextjs-typescript-stripe)
- DynamoDB Patterns: [AWS re:Post Single-Table Design](https://repost.aws/articles/ARs-sKseqITnWrHjMvYzLk7w)
- Strategy Pattern: [FreeCodeCamp Guide](https://www.freecodecamp.org/news/a-beginners-guide-to-the-strategy-design-pattern/)
- Abandoned Cart: [Klaviyo Benchmarks](https://www.klaviyo.com/blog/abandoned-cart-benchmarks)

---

## Summary of Key Decisions

1. **Start with Free Single Course**: Validates architecture without payment complexity
2. **Use Strategy Pattern**: Enables easy addition of paid/bundle enrollment types
3. **Single-Table DynamoDB Design**: Efficient queries, supports all scenarios
4. **Event-Driven with SNS**: Decouples enrollment from payment confirmation
5. **Feature-Based Backend Structure**: Organizes code by domain, not layer
6. **Middleware for Authentication Only**: Detailed authorization in page components/API routes
7. **Simple Recommendations**: Manual curation, series navigation, and instructor-based (no ML)
8. **SEO-Friendly URLs**: Use slugs for course pages (`/advanced-typescript` not `/courses/course-001`)
9. **Payment Provider Abstraction**: Strategy pattern allows easy swapping (Stripe → Paddle)
10. **Future-Ready Architecture**: Core patterns support subscriptions, refunds, analytics without refactoring

---

This research provides a comprehensive blueprint for implementing the enrollment system. The patterns are proven, code examples are concrete, and the migration path from current code is clear. Next step: implement Phase 1 (capture course ID) and validate the flow end-to-end before adding complexity.
