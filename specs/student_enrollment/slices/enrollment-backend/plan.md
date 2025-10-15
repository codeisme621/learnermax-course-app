# Single Free Course Enrollment - Implementation Plan

## Overview

Implement a complete enrollment flow for a single free course that captures course selection during signup, creates enrollment records post-authentication, and provides protected access to course content. This establishes the foundational architecture for all future enrollment scenarios (paid courses, bundles, subscriptions).

**Target User Journey:**
```
Landing Page → Click "Enroll Now" → /enroll?courseid=course-001
→ Sign Up → Verify Email → Sign In → Dashboard (auto-enrolled)
→ Click "Continue Learning" → /learn/course-001 (protected course player)
```

## Current State Analysis

### What Exists Now

**Authentication & User Management:**
- ✅ Dual auth flow (email/password + Google OAuth) via Auth.js + AWS Cognito
- ✅ Event-driven onboarding: Cognito → PostConfirmation → SNS → StudentOnboarding → DynamoDB
- ✅ Student model at `backend/src/models/student.ts:6-14` includes `enrolledCourses: string[]` field
- ✅ Protected route middleware at `frontend/auth.config.ts:9-30` protects `/dashboard`
- ✅ Session management with JWT tokens and automatic refresh

**Backend Infrastructure:**
- ✅ Express API on AWS Lambda with Lambda Web Adapter
- ✅ API Gateway with Cognito Authorizer
- ✅ DynamoDB Students table with `email-index` GSI
- ✅ Route registration pattern at `backend/src/app.ts:34`
- ✅ User context extraction pattern at `backend/src/routes/students.ts:26-30`

**Frontend Structure:**
- ✅ Next.js App Router with server/client component patterns
- ✅ Dashboard page at `frontend/app/dashboard/page.tsx` with placeholder cards
- ✅ Mock course data at `frontend/lib/mock-data/course.ts`
- ✅ Enrollment form at `frontend/components/enrollment/EnrollmentForm.tsx` captures email
- ✅ Query parameter passing through auth flow (email only)

**Course Infrastructure:**
- ⚠️ DynamoDB Courses table defined in `backend/template.yaml:162-178` but unused
- ⚠️ Course backend source files deleted (only compiled `dist/` files remain)
- ✅ Course schema exists in compiled form at `backend/dist/schemas/course.schema.js`

### What's Missing

**Critical Gaps:**
- ❌ **No courseId capture during signup** - EnrollmentForm doesn't persist `courseid` URL parameter
- ❌ **No enrollment API** - No endpoints to create/check/list enrollments
- ❌ **No enrollment data model** - No DynamoDB table or schema for enrollments
- ❌ **No course player** - `/learn/[courseId]` route doesn't exist
- ❌ **No enrollment verification** - Dashboard doesn't fetch or display enrolled courses
- ❌ **No /learn route protection** - Middleware doesn't protect course access

**Architecture Gaps:**
- ❌ No Strategy pattern for enrollment types (free vs paid)
- ❌ No single-table design for scalable enrollment queries
- ❌ No enrollment check before course access

### Key Constraints Discovered

1. **Course Source Files Missing**: Must recreate course repository/service from spec or compiled dist files
2. **ES6 Modules**: All imports must use `.js` extension (e.g., `'./enrollment.repository.js'`)
3. **Middleware Limitation**: Can only check authentication, not enrollment (need page-level checks)
4. **SessionStorage Timing**: Must store `pendingEnrollment` before sign-in redirect

## Desired End State

### Success Criteria

**Functional Requirements:**
1. User clicks "Enroll Now" with `courseid=course-001` in URL
2. `courseid` persists through signup → verify-email → signin flow
3. On first dashboard visit post-auth, user is automatically enrolled in `course-001`
4. Dashboard displays enrolled course(s) fetched from backend API
5. Clicking "Continue Learning" navigates to `/learn/course-001`
6. `/learn/course-001` route is protected by:
   - Authentication check (redirects to signin if not logged in)
   - Enrollment check (redirects to course detail if not enrolled)
7. Course player displays course curriculum and video placeholder

**Data Integrity:**
- Enrollment record exists in new `EducationTable` with adjacency list pattern
- Idempotent enrollment (duplicate attempts return existing enrollment)
- GSI1 enables bidirectional queries (user's courses, course's students)

**Architecture Validation:**
- Strategy pattern implemented (FreeEnrollmentStrategy ready for extension)
- Repository pattern separates data access from business logic
- Feature-based backend structure (`backend/src/features/enrollment/`)
- Server actions pattern for frontend API calls

### Verification Steps

**Manual Testing Checklist:**
1. Navigate to `/` and click "Enroll Now"
2. Verify URL contains `?courseid=course-001`
3. Complete signup flow (email verification)
4. Sign in and land on dashboard
5. Verify course card appears (not "Coming soon" placeholder)
6. Click "Continue Learning" on course card
7. Verify navigated to `/learn/course-001`
8. Verify course player shows curriculum and video placeholder
9. Sign out and attempt to access `/learn/course-001` directly
10. Verify redirected to signin page
11. Sign in and verify can access course player again

**API Testing:**
```bash
# After authentication, get access token and test:
curl -X POST http://localhost:8080/api/enrollments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"courseId": "course-001"}'

curl http://localhost:8080/api/enrollments \
  -H "Authorization: Bearer <token>"

curl http://localhost:8080/api/enrollments/check/course-001 \
  -H "Authorization: Bearer <token>"
```

## What We're NOT Doing

**Out of Scope for This Slice:**
- ❌ Paid course enrollment (requires Stripe integration)
- ❌ Course bundles (requires multi-course enrollment)
- ❌ Progress tracking (enrollments will have `progress: 0`)
- ❌ Video playback functionality (placeholder only)
- ❌ Course completion certificates
- ❌ Upsell flows (free → paid course upgrades)
- ❌ Abandoned cart recovery
- ❌ Course recommendations
- ❌ Email notifications for enrollment
- ❌ Multiple course enrollment in one flow
- ❌ SEO-friendly slugs (using courseId directly for now)

## Implementation Approach

### Architecture Decisions

**1. Single-Table DynamoDB Design (Adjacency List Pattern)**
- Use new `learnermax-education-${Environment}` table exclusively
- Store users, courses, and enrollments in single table
- Enable bidirectional queries: "get user's courses" and "get course's students"
- Access patterns:
  - Users: `PK=USER#userId, SK=METADATA`
  - Courses: `PK=COURSE#courseId, SK=METADATA`
  - Enrollments: `PK=USER#userId, SK=COURSE#courseId`
- GSI1 for reverse queries: `GSI1PK=COURSE#courseId, GSI1SK=USER#userId`
- GSI1 also enables: `GSI1PK=USER#userId, GSI1SK=METADATA` for user lookups by email

**2. Strategy Pattern for Enrollment Types**
- Interface: `EnrollmentStrategy` with `enroll(userId, courseId)` method
- Implementation: `FreeEnrollmentStrategy` (immediate enrollment)
- Future: `PaidEnrollmentStrategy` (returns Stripe checkout URL)
- Service selects strategy based on `course.pricingModel`

**3. Feature-Based Backend Structure (Complete Migration)**
```
backend/src/features/
  enrollment/
    enrollment.controller.ts
    enrollment.service.ts
    enrollment.repository.ts
    enrollment.routes.ts
    enrollment.types.ts
    strategies/
      enrollment-strategy.interface.ts
      free-enrollment.strategy.ts
  courses/
    course.repository.ts      # Migrated to use EducationTable
    course.service.ts
    course.routes.ts          # New feature-based routes
    course.types.ts
  students/
    student.repository.ts     # Migrated to use EducationTable
    student.service.ts
    student.routes.ts         # Migrated from src/routes/students.ts
    student.types.ts
```

**4. React Server Components + Server Actions Pattern**
- Server components fetch data via `auth()` + backend API
- Server actions handle mutations (`enrollInCourse`)
- Client components for interactivity (dashboard enrollment hook)

**5. Two-Phase Enrollment Check**
- Phase 1: Middleware checks authentication only for `/learn` routes
- Phase 2: Page component checks enrollment via backend API
- Redirects to course detail page if not enrolled

---

## Phase 1: Infrastructure Setup & Data Migration

### Overview
Create the single `EducationTable` that will replace the existing `StudentsTable` and `CoursesTable`. Migrate existing data, update all environment variables, and prepare for old table removal.

### Changes Required

#### 1. DynamoDB Education Table

**File**: `backend/template.yaml`
**Location**: After line 178 (after CoursesTable)

Add new table definition:

```yaml
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
        - AttributeName: email
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
        - IndexName: email-index
          KeySchema:
            - AttributeName: email
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES
```

**Note**: The `email-index` GSI maintains compatibility with existing student lookups by email.

#### 2. Lambda Environment Variables

**File**: `backend/template.yaml`
**Location**: Line 336 (ExpressApiFunction environment variables)

Replace existing table environment variables with:

```yaml
EDUCATION_TABLE_NAME: !Ref EducationTable
# Legacy variables removed: STUDENTS_TABLE_NAME, COURSES_TABLE_NAME
```

**Also update StudentOnboardingFunction** (Line ~400):
```yaml
EDUCATION_TABLE_NAME: !Ref EducationTable
# Legacy variables removed: STUDENTS_TABLE_NAME
```

#### 3. Lambda IAM Permissions

**File**: `backend/template.yaml`
**Location**: Line 344 (ExpressApiFunction policies)

Replace existing DynamoDB policies with:

```yaml
- DynamoDBCrudPolicy:
    TableName: !Ref EducationTable
```

**Also update StudentOnboardingFunction policies**:
```yaml
- DynamoDBCrudPolicy:
    TableName: !Ref EducationTable
```

#### 4. Course Repository (Migrated to Single-Table)

**File**: `backend/src/features/courses/course.types.ts` (new)

```typescript
export interface Course {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  pricingModel: 'free' | 'paid';
  price?: number;
  imageUrl: string;
  curriculum: Array<{
    module: string;
    topics: string[];
  }>;
}
```

**File**: `backend/src/features/courses/course.repository.ts` (new)

```typescript
import { docClient } from '../../lib/dynamodb.js';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Course } from './course.types.js';

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;

export const courseRepository = {
  async create(course: Course): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `COURSE#${course.courseId}`,
          SK: 'METADATA',
          GSI1PK: 'COURSE',
          GSI1SK: `COURSE#${course.courseId}`,
          entityType: 'COURSE',
          ...course
        }
      })
    );
  },

  async get(courseId: string): Promise<Course | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `COURSE#${courseId}`,
          SK: 'METADATA'
        }
      })
    );

    if (!result.Item) return undefined;

    // Extract course data (remove DynamoDB keys)
    const { PK, SK, GSI1PK, GSI1SK, entityType, ...courseData } = result.Item;
    return courseData as Course;
  },

  async getAll(): Promise<Course[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'COURSE'
        }
      })
    );

    return (result.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, entityType, ...courseData } = item;
      return courseData as Course;
    });
  }
};
```

#### 5. Student Repository (Migrated to Single-Table)

**File**: `backend/src/features/students/student.types.ts` (new)

```typescript
export interface Student {
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**File**: `backend/src/features/students/student.repository.ts` (new)

```typescript
import { docClient } from '../../lib/dynamodb.js';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Student } from './student.types.js';

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;

export const studentRepository = {
  async create(student: Student): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${student.userId}`,
          SK: 'METADATA',
          GSI1PK: `USER#${student.userId}`,
          GSI1SK: 'METADATA',
          entityType: 'USER',
          email: student.email, // For email-index GSI
          ...student
        }
      })
    );
  },

  async get(userId: string): Promise<Student | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'METADATA'
        }
      })
    );

    if (!result.Item) return undefined;

    const { PK, SK, GSI1PK, GSI1SK, entityType, ...studentData } = result.Item;
    return studentData as Student;
  },

  async getByEmail(email: string): Promise<Student | undefined> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email
        }
      })
    );

    if (!result.Items || result.Items.length === 0) return undefined;

    const item = result.Items[0];
    const { PK, SK, GSI1PK, GSI1SK, entityType, ...studentData } = item;
    return studentData as Student;
  },

  async update(userId: string, updates: Partial<Student>): Promise<void> {
    const updateExpressions: string[] = [];
    const attributeNames: Record<string, string> = {};
    const attributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      updateExpressions.push(`#attr${index} = :val${index}`);
      attributeNames[`#attr${index}`] = key;
      attributeValues[`:val${index}`] = value;
    });

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'METADATA'
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributeValues
      })
    );
  }
};
```

#### 6. Student Onboarding Lambda Migration

**File**: `backend/src/lambdas/student-onboarding.ts`
**Location**: Line 33 (DynamoDB table name)

Change from:
```typescript
const TABLE_NAME = process.env.STUDENTS_TABLE_NAME!;
```

To:
```typescript
const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;
```

**Location**: Line 52 (PutCommand for student creation)

Change from:
```typescript
await docClient.send(
  new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      userId,
      email,
      name,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
);
```

To:
```typescript
await docClient.send(
  new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `USER#${userId}`,
      SK: 'METADATA',
      GSI1PK: `USER#${userId}`,
      GSI1SK: 'METADATA',
      entityType: 'USER',
      email,
      userId,
      name,
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
);
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `cd backend && pnpm run build` - TypeScript compiles without errors
- [ ] Run `cd backend && pnpm test` (if tests exist) - all pass
- [ ] Run `sam validate` - template is valid CloudFormation
- [ ] Check `backend/dist/features/` directory exists after build

#### Phase Completion Validation:
- [ ] All TypeScript files compile: `cd backend && pnpm run build`
- [ ] SAM template validates: `cd backend && sam validate`
- [ ] SAM build succeeds: `cd backend && sam build`
- [ ] Course repository files exist in `backend/src/features/courses/`
- [ ] Student repository files exist in `backend/src/features/students/`
- [ ] Education table defined in `backend/template.yaml` with GSI1 and email-index
- [ ] All table environment variables updated to `EDUCATION_TABLE_NAME`

#### Preview Deployment Validation:
- [ ] Backend deploys successfully: `./scripts/deploy-preview-backend.sh`
- [ ] EducationTable created in DynamoDB console with 2 GSIs
- [ ] Lambda has `EDUCATION_TABLE_NAME` environment variable (not STUDENTS_TABLE_NAME or COURSES_TABLE_NAME)
- [ ] Lambda has DynamoDB permissions for EducationTable only
- [ ] StudentOnboarding Lambda updated to use EducationTable
- [ ] Backend logs show no errors: `cat scripts/.sam-logs.log`

---

## Phase 2: Backend Enrollment API

### Overview
Implement the enrollment service, repository, and API routes with Strategy pattern support. This creates the business logic for enrollment operations.

### Changes Required

#### 1. Enrollment Types

**File**: `backend/src/features/enrollment/enrollment.types.ts` (new)

```typescript
export interface Enrollment {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid' | 'bundle';
  enrolledAt: string;
  paymentStatus: 'free' | 'pending' | 'completed';
  stripeSessionId?: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
}

export interface EnrollmentResult {
  enrollment?: Enrollment;
  checkoutUrl?: string;
  status: 'active' | 'pending';
}
```

#### 2. Enrollment Repository

**File**: `backend/src/features/enrollment/enrollment.repository.ts` (new)

```typescript
import { docClient } from '../../lib/dynamodb.js';
import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Enrollment } from './enrollment.types.js';

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;

export const enrollmentRepository = {
  async create(enrollment: Enrollment): Promise<void> {
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

  async get(userId: string, courseId: string): Promise<Enrollment | undefined> {
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

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
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
    return (result.Items || []) as Enrollment[];
  }
};
```

#### 3. Enrollment Strategy Interface

**File**: `backend/src/features/enrollment/strategies/enrollment-strategy.interface.ts` (new)

```typescript
import type { EnrollmentResult } from '../enrollment.types.js';

export interface EnrollmentStrategy {
  enroll(userId: string, courseId: string): Promise<EnrollmentResult>;
}
```

#### 4. Free Enrollment Strategy

**File**: `backend/src/features/enrollment/strategies/free-enrollment.strategy.ts` (new)

```typescript
import type { EnrollmentStrategy } from './enrollment-strategy.interface.js';
import type { EnrollmentResult } from '../enrollment.types.js';
import { enrollmentRepository } from '../enrollment.repository.js';
import { createLogger } from '../../../lib/logger.js';

const logger = createLogger('FreeEnrollmentStrategy');

export class FreeEnrollmentStrategy implements EnrollmentStrategy {
  async enroll(userId: string, courseId: string): Promise<EnrollmentResult> {
    const enrollment = {
      userId,
      courseId,
      enrollmentType: 'free' as const,
      enrolledAt: new Date().toISOString(),
      paymentStatus: 'free' as const,
      progress: 0,
      completed: false
    };

    // Create enrollment record in EducationTable
    await enrollmentRepository.create(enrollment);

    logger.info('Free enrollment completed', { userId, courseId });

    return {
      enrollment,
      status: 'active'
    };
  }
}
```

#### 5. Enrollment Service

**File**: `backend/src/features/enrollment/enrollment.service.ts` (new)

```typescript
import { enrollmentRepository } from './enrollment.repository.js';
import { courseRepository } from '../courses/course.repository.js';
import { FreeEnrollmentStrategy } from './strategies/free-enrollment.strategy.js';
import { createLogger } from '../../lib/logger.js';
import type { EnrollmentResult } from './enrollment.types.js';

const logger = createLogger('EnrollmentService');

export class EnrollmentService {
  async enrollUser(userId: string, courseId: string): Promise<EnrollmentResult> {
    // Idempotency check
    const existing = await enrollmentRepository.get(userId, courseId);
    if (existing) {
      logger.info('User already enrolled', { userId, courseId });
      return {
        enrollment: existing,
        status: 'active'
      };
    }

    const course = await courseRepository.get(courseId);
    if (!course) {
      throw new Error(`Course not found: ${courseId}`);
    }

    // Strategy selection (extensible for paid/bundle)
    if (course.pricingModel === 'free') {
      const strategy = new FreeEnrollmentStrategy();
      return await strategy.enroll(userId, courseId);
    }

    throw new Error(`Unsupported pricing model: ${course.pricingModel}`);
  }

  async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await enrollmentRepository.get(userId, courseId);
    return enrollment !== undefined && enrollment.paymentStatus !== 'pending';
  }

  async getUserEnrollments(userId: string) {
    return await enrollmentRepository.getUserEnrollments(userId);
  }
}

export const enrollmentService = new EnrollmentService();
```

#### 6. Enrollment Routes

**File**: `backend/src/features/enrollment/enrollment.routes.ts` (new)

```typescript
import express from 'express';
import type { Request, Response, Router } from 'express';
import { enrollmentService } from './enrollment.service.js';
import { enrollmentRepository } from './enrollment.repository.js';
import { createLogger } from '../../lib/logger.js';

// Import getUserIdFromContext from students routes pattern
interface ApiGatewayRequest extends Request {
  apiGateway?: {
    event?: {
      requestContext?: {
        authorizer?: {
          claims?: {
            sub?: string;
          };
        };
      };
    };
  };
}

function getUserIdFromContext(req: Request): string | null {
  const apiGatewayReq = req as ApiGatewayRequest;
  return apiGatewayReq.apiGateway?.event?.requestContext?.authorizer?.claims?.sub || null;
}

const router: Router = express.Router();
const logger = createLogger('EnrollmentRoutes');

// POST /api/enrollments - Create enrollment
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { courseId } = req.body;
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }

    const result = await enrollmentService.enrollUser(userId, courseId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Enrollment failed', { error });
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// GET /api/enrollments - Get user's enrollments
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const enrollments = await enrollmentRepository.getUserEnrollments(userId);
    res.json(enrollments);
  } catch (error) {
    logger.error('Failed to get enrollments', { error });
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// GET /api/enrollments/check/:courseId - Check enrollment status
router.get('/check/:courseId', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

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

#### 7. Student Routes (Migrate to Feature-Based)

**File**: `backend/src/features/students/student.service.ts` (new)

```typescript
import { studentRepository } from './student.repository.js';
import { createLogger } from '../../lib/logger.js';
import type { Student } from './student.types.js';

const logger = createLogger('StudentService');

export class StudentService {
  async getStudent(userId: string): Promise<Student | undefined> {
    return await studentRepository.get(userId);
  }

  async getStudentByEmail(email: string): Promise<Student | undefined> {
    return await studentRepository.getByEmail(email);
  }

  async updateStudent(userId: string, updates: Partial<Student>): Promise<void> {
    await studentRepository.update(userId, updates);
    logger.info('Student updated', { userId, updates });
  }
}

export const studentService = new StudentService();
```

**File**: `backend/src/features/students/student.routes.ts` (new - migrated from `src/routes/students.ts`)

```typescript
import express from 'express';
import type { Request, Response, Router } from 'express';
import { studentService } from './student.service.js';
import { createLogger } from '../../lib/logger.js';

interface ApiGatewayRequest extends Request {
  apiGateway?: {
    event?: {
      requestContext?: {
        authorizer?: {
          claims?: {
            sub?: string;
          };
        };
      };
    };
  };
}

function getUserIdFromContext(req: Request): string | null {
  const apiGatewayReq = req as ApiGatewayRequest;
  return apiGatewayReq.apiGateway?.event?.requestContext?.authorizer?.claims?.sub || null;
}

const router: Router = express.Router();
const logger = createLogger('StudentRoutes');

// GET /api/students/me - Get current student profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const student = await studentService.getStudent(userId);
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json(student);
  } catch (error) {
    logger.error('Failed to get student', { error });
    res.status(500).json({ error: 'Failed to get student' });
  }
});

// PATCH /api/students/me - Update current student profile
router.patch('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updates = req.body;
    await studentService.updateStudent(userId, updates);

    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    logger.error('Failed to update student', { error });
    res.status(500).json({ error: 'Failed to update student' });
  }
});

export default router;
```

#### 8. Course Routes (Feature-Based)

**File**: `backend/src/features/courses/course.service.ts` (new)

```typescript
import { courseRepository } from './course.repository.js';
import { createLogger } from '../../lib/logger.js';
import type { Course } from './course.types.js';

const logger = createLogger('CourseService');

export class CourseService {
  async getCourse(courseId: string): Promise<Course | undefined> {
    return await courseRepository.get(courseId);
  }

  async getAllCourses(): Promise<Course[]> {
    return await courseRepository.getAll();
  }

  async createCourse(course: Course): Promise<void> {
    await courseRepository.create(course);
    logger.info('Course created', { courseId: course.courseId });
  }
}

export const courseService = new CourseService();
```

**File**: `backend/src/features/courses/course.routes.ts` (new)

```typescript
import express from 'express';
import type { Request, Response, Router } from 'express';
import { courseService } from './course.service.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = express.Router();
const logger = createLogger('CourseRoutes');

// GET /api/courses - Get all courses
router.get('/', async (req: Request, res: Response) => {
  try {
    const courses = await courseService.getAllCourses();
    res.json(courses);
  } catch (error) {
    logger.error('Failed to get courses', { error });
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// GET /api/courses/:courseId - Get single course
router.get('/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await courseService.getCourse(courseId);

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json(course);
  } catch (error) {
    logger.error('Failed to get course', { error });
    res.status(500).json({ error: 'Failed to get course' });
  }
});

export default router;
```

#### 9. Register All Feature-Based Routes

**File**: `backend/src/app.ts`
**Location**: After line 28 (after route imports)

Replace existing route imports with feature-based imports:
```typescript
// Remove: import studentRoutes from './routes/students.js';
// Add feature-based imports:
import enrollmentRoutes from './features/enrollment/enrollment.routes.js';
import studentRoutes from './features/students/student.routes.js';
import courseRoutes from './features/courses/course.routes.js';
```

**Location**: After line 34 (route registration section)

Replace with:
```typescript
// Feature-based routes
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
```

#### 8. Course Actions (Frontend Server Actions)

**File**: `frontend/app/actions/courses.ts` (new)

```typescript
'use server';

import { auth } from '@/lib/auth';
import { getAccessToken } from './auth';

export async function getCourse(courseId: string) {
  const session = await auth();
  if (!session) throw new Error('Not authenticated');

  const accessToken = await getAccessToken();

  const response = await fetch(`${process.env.API_URL}/api/courses/${courseId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch course: ${courseId}`);
  }

  return await response.json();
}

export async function getAllCourses() {
  const session = await auth();
  if (!session) return [];

  const accessToken = await getAccessToken();

  const response = await fetch(`${process.env.API_URL}/api/courses`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) return [];
  return await response.json();
}
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `pnpm run build` after each file - compiles without errors
- [ ] Run `pnpm test` after creating files - all pass
- [ ] Check imports resolve correctly (`.js` extension present)
- [ ] Verify TypeScript types are correct (no `any` types)

#### Phase Completion Validation:
- [ ] All TypeScript compiles: `cd backend && pnpm run build`
- [ ] Type checking passes: `cd backend && pnpm run typecheck` (if configured)
- [ ] Linting passes: `cd backend && pnpm run lint` (if configured)
- [ ] Backend builds successfully: `cd backend && sam build`
- [ ] All feature files exist in `backend/src/features/enrollment/`
- [ ] Routes registered in `backend/src/app.ts:34-35`

#### Preview Deployment Validation:
- [ ] Backend deploys: `./scripts/deploy-preview-backend.sh`
- [ ] API endpoints accessible:
  ```bash
  # Get auth token from frontend session
  curl -X POST <API_URL>/api/enrollments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d '{"courseId": "course-001"}'
  # Should return 201 with enrollment data

  curl <API_URL>/api/enrollments \
    -H "Authorization: Bearer <token>"
  # Should return 200 with array of enrollments
  ```
- [ ] No errors in logs: `cat scripts/.sam-logs.log`
- [ ] DynamoDB contains enrollment record with correct PK/SK

---

## Phase 3: Course ID Capture Flow

### Overview
Modify frontend components to capture the `courseid` URL parameter during signup and persist it through the authentication flow using sessionStorage.

### Changes Required

#### 1. Enrollment Form - Capture and Forward courseId

**File**: `frontend/components/enrollment/EnrollmentForm.tsx`
**Location**: After line 16 (after useState declarations)

Add:
```typescript
const searchParams = useSearchParams();
const courseId = searchParams.get('courseid') || 'course-001';
```

**Location**: Line 44 (modify router.push)

Change from:
```typescript
router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
```

To:
```typescript
router.push(`/verify-email?email=${encodeURIComponent(formData.email)}&courseid=${courseId}`);
```

#### 2. Verify Email Form - Forward courseId

**File**: `frontend/components/enrollment/VerifyEmailForm.tsx`
**Location**: After line 16 (after searchParams)

Add:
```typescript
const courseId = searchParams.get('courseid') || 'course-001';
```

**Location**: Line 51 (modify router.push)

Change from:
```typescript
router.push('/signin?callbackUrl=/dashboard');
```

To:
```typescript
router.push(`/signin?callbackUrl=/dashboard&courseid=${courseId}`);
```

#### 3. Sign-In Form - Store courseId in sessionStorage

**File**: `frontend/components/auth/SignInForm.tsx`
**Location**: After line 15 (in component body)

Add:
```typescript
const searchParams = useSearchParams();

// Store pending enrollment before signin
useEffect(() => {
  const courseId = searchParams.get('courseid');
  if (courseId) {
    sessionStorage.setItem('pendingEnrollment', courseId);
  }
}, [searchParams]);
```

**Note**: This stores `courseid` before authentication so dashboard can retrieve it after successful login.

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `cd frontend && pnpm run dev` - dev server starts without errors
- [ ] Visit `http://localhost:3000/enroll?courseid=test-123`
- [ ] Check browser console - no errors
- [ ] Complete signup flow and check sessionStorage has `pendingEnrollment` key

#### Phase Completion Validation:
- [ ] TypeScript compiles: `cd frontend && pnpm run build`
- [ ] Type checking passes: `cd frontend && pnpm run typecheck` (if configured)
- [ ] All React component tests pass: `cd frontend && pnpm test`
- [ ] Dev server runs without errors: `cd frontend && pnpm run dev`

#### Manual Testing:
1. Navigate to `http://localhost:3000/enroll?courseid=course-001`
2. Fill enrollment form and submit
3. Check URL contains `courseid=course-001` on verify-email page
4. Enter verification code
5. Check URL contains `courseid=course-001` on signin page
6. Open browser DevTools → Application → Session Storage
7. Verify `pendingEnrollment` key exists with value `course-001`
8. Sign in
9. Verify redirected to dashboard

#### Preview Deployment Validation:
- [ ] Frontend deploys: `./scripts/deploy-preview-frontend.sh`
- [ ] Navigate to preview URL + `/enroll?courseid=course-001`
- [ ] Complete signup flow on preview
- [ ] Verify sessionStorage contains `pendingEnrollment` on preview
- [ ] No errors in logs: `cat scripts/.vercel-logs.log`

---

## Phase 4: Frontend Enrollment Integration

### Overview
Create enrollment server actions, update dashboard to fetch and display enrolled courses, and implement automatic enrollment on first login.

### Changes Required

#### 1. Enrollment Server Actions

**File**: `frontend/app/actions/enrollment.ts` (new)

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

  if (!response.ok) return [];
  return await response.json();
}

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

#### 2. Dashboard Page - Add Enrollment Hook

**File**: `frontend/app/dashboard/page.tsx`
**Location**: Change to client component

Replace entire file content:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { enrollInCourse } from '@/app/actions/enrollment';
import DashboardContent from '@/components/dashboard/DashboardContent';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [enrollmentProcessed, setEnrollmentProcessed] = useState(false);

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    redirect('/signin?callbackUrl=/dashboard');
  }

  useEffect(() => {
    if (status !== 'authenticated' || enrollmentProcessed) return;

    const pendingEnrollment = sessionStorage.getItem('pendingEnrollment');

    if (pendingEnrollment) {
      enrollInCourse(pendingEnrollment)
        .then(() => {
          sessionStorage.removeItem('pendingEnrollment');
          setEnrollmentProcessed(true);
          // Trigger re-render by reloading
          window.location.reload();
        })
        .catch(error => {
          console.error('Failed to enroll:', error);
          setEnrollmentProcessed(true);
        });
    } else {
      setEnrollmentProcessed(true);
    }
  }, [status, enrollmentProcessed]);

  if (status === 'loading' || !enrollmentProcessed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 py-12 bg-muted/30">
        {session && <DashboardContent session={session} />}
      </main>
      <Footer />
    </>
  );
}
```

#### 3. Dashboard Content - Display Enrolled Courses

**File**: `frontend/components/dashboard/DashboardContent.tsx`
**Location**: Modify to be server component that fetches enrollments

Replace entire file content:

```typescript
import { getMyEnrollments } from '@/app/actions/enrollment';
import { getCourse } from '@/app/actions/courses';
import { SignOutButton } from '@/components/auth/SignOutButton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';
import type { Session } from 'next-auth';

interface DashboardContentProps {
  session: Session;
}

export default async function DashboardContent({ session }: DashboardContentProps) {
  const enrollments = await getMyEnrollments();

  // Fetch course details for each enrollment
  const enrolledCourses = await Promise.all(
    enrollments.map(async (enrollment: any) => {
      try {
        const course = await getCourse(enrollment.courseId);
        return {
          ...enrollment,
          course
        };
      } catch (error) {
        console.error(`Failed to fetch course ${enrollment.courseId}:`, error);
        return null;
      }
    })
  ).then(results => results.filter(Boolean));

  const firstName = session.user?.name?.split(' ')[0] || 'Student';

  return (
    <div className="container mx-auto px-4">
      {/* Welcome Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {firstName}!</h1>
          <p className="text-muted-foreground">Continue your learning journey</p>
        </div>
        <SignOutButton />
      </div>

      {/* Enrolled Courses Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">My Courses</h2>

        {enrolledCourses.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">You're not enrolled in any courses yet</p>
            <Link href="/courses">
              <Button>Browse Courses</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((item: any) => (
              <div key={item.courseId} className="border rounded-lg p-6 hover:shadow-lg transition bg-card">
                <img
                  src={item.course?.imageUrl || '/placeholder-course.jpg'}
                  alt={item.course?.name || 'Course'}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />

                <h3 className="text-xl font-semibold mb-2">{item.course?.name || 'Unknown Course'}</h3>
                <p className="text-sm text-muted-foreground mb-4">{item.course?.instructor || 'Instructor'}</p>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{item.progress || 0}%</span>
                  </div>
                  <Progress value={item.progress || 0} />
                </div>

                <Link href={`/learn/${item.courseId}`}>
                  <Button className="w-full">
                    {item.completed ? 'Review Course' : 'Continue Learning'}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Development Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Session Debug Info:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

**Note**: This requires fixing the dashboard page to pass session correctly. Dashboard page should remain server component that fetches session, then passes to DashboardContent.

**Revised approach - Keep dashboard as server component:**

Revert dashboard page to server component:

**File**: `frontend/app/dashboard/page.tsx`

```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import DashboardContent from '@/components/dashboard/DashboardContent';
import DashboardEnrollmentHandler from '@/components/dashboard/DashboardEnrollmentHandler';

export const metadata = {
  title: 'Dashboard - LearnerMax',
  description: 'Your learning dashboard',
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/signin?callbackUrl=/dashboard');
  }

  return (
    <>
      <Header />
      <DashboardEnrollmentHandler />
      <main className="min-h-screen pt-20 py-12 bg-muted/30">
        <DashboardContent session={session} />
      </main>
      <Footer />
    </>
  );
}
```

**File**: `frontend/components/dashboard/DashboardEnrollmentHandler.tsx` (new)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { enrollInCourse } from '@/app/actions/enrollment';

export default function DashboardEnrollmentHandler() {
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;

    const pendingEnrollment = sessionStorage.getItem('pendingEnrollment');

    if (pendingEnrollment) {
      enrollInCourse(pendingEnrollment)
        .then(() => {
          sessionStorage.removeItem('pendingEnrollment');
          setProcessed(true);
          window.location.reload();
        })
        .catch(error => {
          console.error('Failed to enroll:', error);
          setProcessed(true);
        });
    } else {
      setProcessed(true);
    }
  }, [processed]);

  return null; // No UI rendered
}
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `cd frontend && pnpm run dev` after each file
- [ ] Check browser console for errors
- [ ] Verify TypeScript compilation: `pnpm run build`
- [ ] Test server actions work by logging output

#### Phase Completion Validation:
- [ ] Frontend compiles: `cd frontend && pnpm run build`
- [ ] No TypeScript errors: `cd frontend && pnpm run typecheck`
- [ ] All tests pass: `cd frontend && pnpm test`
- [ ] Dev server runs: `cd frontend && pnpm run dev`

#### Manual Testing:
1. Complete signup flow with `courseid=course-001`
2. Land on dashboard after signin
3. Wait for enrollment to process (loading state)
4. Page should reload automatically
5. Dashboard should display enrolled course card (not "Coming soon")
6. Course card should show:
   - Course name and instructor
   - Progress bar at 0%
   - "Continue Learning" button

#### Preview Deployment Validation:
- [ ] Frontend deploys: `./scripts/deploy-preview-frontend.sh`
- [ ] Complete signup flow on preview URL
- [ ] Verify dashboard shows enrolled course
- [ ] Verify "Continue Learning" button appears
- [ ] No errors in logs: `cat scripts/.vercel-logs.log`
- [ ] Check backend enrollment created: Query DynamoDB or check API

---

## Phase 5: Protected Course Player

### Overview
Create the `/learn/[courseId]` route with authentication and enrollment checks, and build the course player component with curriculum display and video placeholder.

### Changes Required

#### 1. Middleware Update - Protect /learn Routes

**File**: `frontend/auth.config.ts`
**Location**: Line 11 (after `isOnDashboard` declaration)

Add:
```typescript
const isOnLearn = nextUrl.pathname.startsWith('/learn');
```

**Location**: Line 27 (after dashboard protection logic)

Add:
```typescript
// Protect learn routes (authentication only, enrollment check in page)
if (isOnLearn) {
  if (isLoggedIn) return true;
  return false;
}
```

#### 2. Learn Page with Enrollment Check

**File**: `frontend/app/learn/[courseId]/page.tsx` (new)

```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { checkEnrollment } from '@/app/actions/enrollment';
import { getCourse } from '@/app/actions/courses';
import CoursePlayer from '@/components/learn/CoursePlayer';
import { Header } from '@/components/layout/Header';

interface LearnPageProps {
  params: {
    courseId: string;
  };
}

export default async function LearnPage({ params }: LearnPageProps) {
  const session = await auth();

  // Authentication check
  if (!session) {
    redirect(`/signin?callbackUrl=/learn/${params.courseId}`);
  }

  // Enrollment check
  const enrolled = await checkEnrollment(params.courseId);

  if (!enrolled) {
    // Redirect to course detail page (or enrollment page)
    redirect(`/courses/${params.courseId}`);
  }

  // Fetch course data
  const course = await getCourse(params.courseId);

  return (
    <>
      <Header />
      <CoursePlayer course={course} />
    </>
  );
}
```

#### 3. Course Player Component

**File**: `frontend/components/learn/CoursePlayer.tsx` (new)

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';

interface Course {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  imageUrl: string;
  curriculum: Array<{
    module: string;
    topics: string[];
  }>;
}

interface CoursePlayerProps {
  course: Course;
}

export default function CoursePlayer({ course }: CoursePlayerProps) {
  const [currentLesson, setCurrentLesson] = useState(0);
  const [showCurriculum, setShowCurriculum] = useState(true);

  const totalLessons = course.curriculum.reduce(
    (sum, module) => sum + module.topics.length,
    0
  );
  const progress = totalLessons > 0 ? (currentLesson / totalLessons) * 100 : 0;

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="container mx-auto px-4 py-8">
        {/* Course Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{course.name}</h1>
          <p className="text-muted-foreground mb-4">Instructor: {course.instructor}</p>
          <Progress value={progress} className="mb-2" />
          <p className="text-sm text-muted-foreground">
            {currentLesson} of {totalLessons} lessons completed ({Math.round(progress)}%)
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 border">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
                <p className="text-muted-foreground">Video Player Placeholder</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Lesson {currentLesson + 1}: {getCurrentLessonTitle()}
                </p>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex justify-between items-center">
              <Button
                onClick={() => setCurrentLesson(prev => Math.max(0, prev - 1))}
                disabled={currentLesson === 0}
                variant="outline"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous Lesson
              </Button>

              <Button
                onClick={() => setCurrentLesson(prev => Math.min(totalLessons - 1, prev + 1))}
                disabled={currentLesson === totalLessons - 1}
              >
                Next Lesson
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Curriculum Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <List className="mr-2 h-5 w-5" />
                  Course Curriculum
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCurriculum(!showCurriculum)}
                  className="lg:hidden"
                >
                  {showCurriculum ? 'Hide' : 'Show'}
                </Button>
              </div>

              {showCurriculum && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {course.curriculum.map((module, moduleIdx) => (
                    <div key={moduleIdx} className="border rounded-lg p-4 bg-card">
                      <h3 className="font-medium mb-3">{module.module}</h3>
                      <ul className="space-y-2">
                        {module.topics.map((topic, topicIdx) => {
                          const lessonIndex = getLessonIndex(moduleIdx, topicIdx);
                          const isCurrentLesson = lessonIndex === currentLesson;

                          return (
                            <li
                              key={topicIdx}
                              className={`text-sm pl-4 py-1 cursor-pointer rounded transition ${
                                isCurrentLesson
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={() => setCurrentLesson(lessonIndex)}
                            >
                              {topic}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function getCurrentLessonTitle(): string {
    let lessonCount = 0;
    for (const module of course.curriculum) {
      for (const topic of module.topics) {
        if (lessonCount === currentLesson) {
          return topic;
        }
        lessonCount++;
      }
    }
    return 'Unknown Lesson';
  }

  function getLessonIndex(moduleIdx: number, topicIdx: number): number {
    let index = 0;
    for (let i = 0; i < moduleIdx; i++) {
      index += course.curriculum[i].topics.length;
    }
    return index + topicIdx;
  }
}
```

### Success Criteria

#### Continuous Validation (During Implementation):
- [ ] Run `cd frontend && pnpm run dev`
- [ ] Navigate to `http://localhost:3000/learn/course-001` while signed out
- [ ] Verify redirected to signin
- [ ] Sign in and verify redirected back to learn page
- [ ] Check browser console for errors

#### Phase Completion Validation:
- [ ] Frontend compiles: `cd frontend && pnpm run build`
- [ ] TypeScript passes: `cd frontend && pnpm run typecheck`
- [ ] All tests pass: `cd frontend && pnpm test`
- [ ] Dev server runs: `cd frontend && pnpm run dev`

#### Manual Testing:
1. **Unauthenticated Access Test:**
   - Sign out if signed in
   - Navigate to `http://localhost:3000/learn/course-001`
   - Verify redirected to `/signin?callbackUrl=/learn/course-001`

2. **Unenrolled Access Test:**
   - Sign in with account not enrolled in `course-001`
   - Navigate to `/learn/course-001`
   - Verify redirected to `/courses/course-001` (or shows error)

3. **Enrolled Access Test:**
   - Complete enrollment flow for `course-001`
   - Navigate to `/learn/course-001`
   - Verify course player displays:
     - Course name and instructor
     - Progress bar
     - Video placeholder
     - Curriculum sidebar with modules and topics
     - Previous/Next lesson buttons

4. **Curriculum Navigation Test:**
   - Click on different topics in curriculum
   - Verify current lesson updates
   - Verify progress bar updates
   - Click Previous/Next buttons
   - Verify navigation works correctly

#### Preview Deployment Validation:
- [ ] Frontend deploys: `./scripts/deploy-preview-frontend.sh`
- [ ] Navigate to preview URL + `/learn/course-001` while signed out
- [ ] Verify redirected to signin
- [ ] Sign in and verify course player works
- [ ] Test curriculum navigation on preview
- [ ] No errors in logs: `cat scripts/.vercel-logs.log`

---

## Phase 6: Integration Testing & Seed Data

### Overview
Create seed data for testing, write E2E tests for the complete enrollment flow, and verify all components work together.

### Changes Required

#### 1. Seed Course Data Script

**File**: `backend/scripts/seed-courses.ts` (new - updated for single-table)

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME || 'learnermax-education-local';

const seedCourse = {
  courseId: 'course-001',
  name: 'Master Modern Web Development',
  description: 'Learn to build full-stack web applications with React, Node.js, and TypeScript',
  instructor: 'Sarah Johnson',
  pricingModel: 'free',
  imageUrl: '/images/course-web-dev.jpg',
  curriculum: [
    {
      module: 'Module 1: Frontend Fundamentals',
      topics: [
        'Introduction to React',
        'Components and Props',
        'State Management with Hooks',
        'Routing with React Router',
        'Styling with Tailwind CSS'
      ]
    },
    {
      module: 'Module 2: Backend Development',
      topics: [
        'Node.js and Express Setup',
        'RESTful API Design',
        'Database Integration',
        'Authentication Patterns',
        'Error Handling'
      ]
    },
    {
      module: 'Module 3: TypeScript',
      topics: [
        'TypeScript Basics',
        'Type Safety in React',
        'Advanced Types',
        'Generic Programming',
        'Type Guards'
      ]
    }
  ]
};

async function seedCourses() {
  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `COURSE#${seedCourse.courseId}`,
          SK: 'METADATA',
          GSI1PK: 'COURSE',
          GSI1SK: `COURSE#${seedCourse.courseId}`,
          entityType: 'COURSE',
          ...seedCourse
        }
      })
    );
    console.log('✅ Successfully seeded course:', seedCourse.courseId);
  } catch (error) {
    console.error('❌ Failed to seed course:', error);
    process.exit(1);
  }
}

seedCourses();
```

**File**: `backend/package.json`
**Location**: Add to scripts section

```json
"seed:courses": "tsx scripts/seed-courses.ts"
```

#### 2. E2E Test for Enrollment Flow

**File**: `e2e/tests/enrollment-flow.spec.ts` (new)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Free Course Enrollment Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  const testName = 'Test User';

  test('complete enrollment flow from landing to course player', async ({ page }) => {
    // 1. Start at landing page with courseId
    await page.goto('/?courseid=course-001');

    // 2. Click "Enroll Now" button
    await page.click('text=Enroll Now');

    // 3. Verify redirected to enrollment page with courseId
    await expect(page).toHaveURL(/\/enroll\?courseid=course-001/);

    // 4. Fill enrollment form
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // 5. Verify redirected to verify-email with courseId
    await expect(page).toHaveURL(/\/verify-email\?.*courseid=course-001/);

    // 6. Enter verification code (mock or wait for email)
    // NOTE: This requires mocking Cognito or using test credentials
    await page.fill('input[name="code"]', '123456');
    await page.click('button[type="submit"]');

    // 7. Verify redirected to signin with courseId
    await expect(page).toHaveURL(/\/signin\?.*courseid=course-001/);

    // 8. Sign in
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // 9. Verify redirected to dashboard
    await expect(page).toHaveURL('/dashboard');

    // 10. Wait for enrollment to process
    await page.waitForTimeout(2000);

    // 11. Verify course appears in dashboard
    await expect(page.locator('text=Master Modern Web Development')).toBeVisible();
    await expect(page.locator('text=Continue Learning')).toBeVisible();

    // 12. Click "Continue Learning"
    await page.click('text=Continue Learning');

    // 13. Verify navigated to course player
    await expect(page).toHaveURL('/learn/course-001');

    // 14. Verify course player elements
    await expect(page.locator('text=Master Modern Web Development')).toBeVisible();
    await expect(page.locator('text=Instructor: Sarah Johnson')).toBeVisible();
    await expect(page.locator('text=Course Curriculum')).toBeVisible();
    await expect(page.locator('text=Video Player Placeholder')).toBeVisible();

    // 15. Test curriculum navigation
    await page.click('text=Introduction to React');
    await expect(page.locator('text=Lesson 1: Introduction to React')).toBeVisible();

    // 16. Test next lesson button
    await page.click('text=Next Lesson');
    await expect(page.locator('text=Lesson 2: Components and Props')).toBeVisible();
  });

  test('unauthenticated user redirected from /learn route', async ({ page }) => {
    // Navigate directly to learn page without auth
    await page.goto('/learn/course-001');

    // Verify redirected to signin with callbackUrl
    await expect(page).toHaveURL(/\/signin\?callbackUrl=.*learn.*course-001/);
  });

  test('authenticated but unenrolled user redirected from /learn route', async ({ page, context }) => {
    // TODO: Sign in with user not enrolled in course-001
    // Verify redirected to course detail page
    // This requires authentication setup in E2E
  });
});

test.describe('Dashboard Enrollment Display', () => {
  test('shows empty state when no enrollments', async ({ page }) => {
    // TODO: Sign in with new user
    // Verify "You're not enrolled in any courses yet" message
    // Verify "Browse Courses" button
  });

  test('shows enrolled courses', async ({ page }) => {
    // TODO: Sign in with user enrolled in course-001
    // Verify course card appears with correct details
    // Verify progress bar shows 0%
    // Verify "Continue Learning" button
  });
});
```

#### 3. Local Development Test Script

**File**: `scripts/test-enrollment-local.sh` (new)

```bash
#!/bin/bash

echo "🧪 Testing Enrollment Flow Locally"
echo "=================================="

# Start backend
echo "1. Starting backend..."
cd backend
pnpm run dev &
BACKEND_PID=$!
sleep 5

# Start frontend
echo "2. Starting frontend..."
cd ../frontend
pnpm run dev &
FRONTEND_PID=$!
sleep 10

# Run E2E tests
echo "3. Running E2E tests..."
cd ../e2e
pnpm test

# Capture exit code
TEST_EXIT_CODE=$?

# Cleanup
echo "4. Cleaning up..."
kill $BACKEND_PID
kill $FRONTEND_PID

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Tests failed!"
fi

exit $TEST_EXIT_CODE
```

Make executable:
```bash
chmod +x scripts/test-enrollment-local.sh
```

### Success Criteria

#### Phase Completion Validation:
- [ ] Seed script runs: `cd backend && pnpm run seed:courses`
- [ ] Course appears in DynamoDB Courses table
- [ ] E2E tests written in `e2e/tests/enrollment-flow.spec.ts`
- [ ] Backend runs locally: `cd backend && pnpm run dev`
- [ ] Frontend runs locally: `cd frontend && pnpm run dev`
- [ ] Can access `http://localhost:3000` with enrollment flow

#### Preview Deployment Validation:
- [ ] Backend deployed: `./scripts/deploy-preview-backend.sh`
- [ ] Seed course data in preview environment:
  ```bash
  cd backend
  AWS_REGION=us-east-1 \
  EDUCATION_TABLE_NAME=learnermax-education-preview \
  pnpm run seed:courses
  ```
- [ ] Frontend deployed: `./scripts/deploy-preview-frontend.sh`
- [ ] E2E tests run against preview: `cd e2e && pnpm test`
- [ ] All E2E tests pass
- [ ] No errors in backend logs: `cat scripts/.sam-logs.log`
- [ ] No errors in frontend logs: `cat scripts/.vercel-logs.log`

#### Complete Manual Testing:
1. Start both backend and frontend locally
2. Navigate to `http://localhost:3000/?courseid=course-001`
3. Complete entire enrollment flow:
   - Click "Enroll Now"
   - Fill signup form
   - Verify email
   - Sign in
   - Land on dashboard
   - See enrolled course
   - Click "Continue Learning"
   - Access course player
4. Verify all success criteria from each phase
5. Test edge cases:
   - Attempt to access `/learn/course-001` without authentication
   - Attempt to access `/learn/course-001` without enrollment
   - Try enrolling in same course twice (should be idempotent)

---

## Phase 7: Cleanup & Remove Legacy Infrastructure

### Overview
Remove old DynamoDB tables, legacy route files, and update all references to complete the migration to single-table design and feature-based architecture.

### Changes Required

#### 1. Remove Old Route Files

**Files to Delete:**
- `backend/src/routes/students.ts` - Replaced by `src/features/students/student.routes.ts`
- `backend/src/routes/` directory (if now empty)

**Command:**
```bash
cd backend
rm -f src/routes/students.ts
# Remove routes directory if empty
[ -z "$(ls -A src/routes 2>/dev/null)" ] && rm -rf src/routes
```

#### 2. Remove Old Model Files

**Files to Delete:**
- `backend/src/models/student.ts` - Replaced by `src/features/students/student.types.ts`
- `backend/src/models/` directory (if contains only deprecated files)

**Command:**
```bash
cd backend
rm -f src/models/student.ts
# Check if models directory has other files before removing
```

#### 3. Remove Old DynamoDB Tables from SAM Template

**File**: `backend/template.yaml`

**Remove these table definitions:**

```yaml
# Remove StudentsTable (typically around line 140-162)
StudentsTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: !Sub learnermax-students-${Environment}
    # ... (entire definition)

# Remove CoursesTable (typically around line 162-178)
CoursesTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: !Sub learnermax-courses-${Environment}
    # ... (entire definition)
```

**Action**: Delete both `StudentsTable` and `CoursesTable` resource definitions entirely.

#### 4. Remove Old Table Outputs from SAM Template

**File**: `backend/template.yaml`
**Location**: Outputs section (bottom of file)

**Remove:**
```yaml
StudentsTableName:
  Description: "Students DynamoDB table name"
  Value: !Ref StudentsTable

CoursesTableName:
  Description: "Courses DynamoDB table name"
  Value: !Ref CoursesTable
```

**Add:**
```yaml
EducationTableName:
  Description: "Education DynamoDB table name (single-table design)"
  Value: !Ref EducationTable
```

#### 5. Update Documentation

**File**: `backend/README.md` (if exists)

Update any references to:
- Old table names (`StudentsTable`, `CoursesTable`) → `EducationTable`
- Old route structure (`src/routes/`) → `src/features/`
- Old model imports → New feature-based types

**Example changes:**
```markdown
# BEFORE:
- Students stored in `learnermax-students-${env}` table
- Courses stored in `learnermax-courses-${env}` table
- Routes in `src/routes/students.ts`

# AFTER:
- All entities stored in `learnermax-education-${env}` table (single-table design)
- Routes in `src/features/{feature-name}/{feature-name}.routes.ts`
- Using adjacency list pattern for efficient queries
```

#### 6. Clean Up Deployment Scripts (If Needed)

**File**: `scripts/deploy-preview-backend.sh`

Search for and remove any references to:
- `STUDENTS_TABLE_NAME` environment variable
- `COURSES_TABLE_NAME` environment variable

Ensure only `EDUCATION_TABLE_NAME` is referenced.

### Database Migration Strategy

**IMPORTANT**: Since you mentioned "no users are on the service", we can safely:

1. **Deploy new infrastructure** with EducationTable
2. **Seed fresh data** into EducationTable using the updated seed script
3. **Remove old tables** via CloudFormation update (SAM deploy will delete them)

**No data migration script needed** - this is a clean slate deployment.

**If you had existing data (for future reference):**
```typescript
// Migration script would look like:
// 1. Scan old StudentsTable
// 2. Transform each item to PK=USER#userId, SK=METADATA format
// 3. Write to EducationTable
// 4. Verify all data migrated
// 5. Delete old tables
```

### Success Criteria

#### Phase Completion Validation:
- [ ] All old route files deleted (`src/routes/students.ts`)
- [ ] All old model files deleted (if deprecated)
- [ ] `StudentsTable` removed from `backend/template.yaml`
- [ ] `CoursesTable` removed from `backend/template.yaml`
- [ ] Only `EducationTable` defined in template
- [ ] TypeScript compiles: `cd backend && pnpm run build`
- [ ] SAM validates: `cd backend && sam validate`
- [ ] No imports reference old paths (verify with grep)

#### Verify No Legacy References:
```bash
cd backend

# Should return no results:
grep -r "STUDENTS_TABLE_NAME" src/
grep -r "COURSES_TABLE_NAME" src/
grep -r "from './routes/students" src/
grep -r "from './models/student" src/

# Should return results (new patterns):
grep -r "EDUCATION_TABLE_NAME" src/
grep -r "from './features/" src/
```

#### Preview Deployment Validation:
- [ ] Deploy backend: `./scripts/deploy-preview-backend.sh`
- [ ] Verify in AWS Console:
  - [ ] `EducationTable` exists with GSI1 and email-index
  - [ ] `StudentsTable` deleted (no longer exists)
  - [ ] `CoursesTable` deleted (no longer exists)
- [ ] Seed course data: `EDUCATION_TABLE_NAME=learnermax-education-preview pnpm run seed:courses`
- [ ] Test all API endpoints:
  ```bash
  # Get courses
  curl <API_URL>/api/courses

  # Get student profile
  curl <API_URL>/api/students/me -H "Authorization: Bearer <token>"

  # Create enrollment
  curl -X POST <API_URL>/api/enrollments \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d '{"courseId": "course-001"}'
  ```
- [ ] Verify all endpoints work correctly with single EducationTable
- [ ] No errors in logs: `cat scripts/.sam-logs.log`

#### Production Deployment Checklist:
- [ ] All phases 1-6 completed and tested in preview
- [ ] E2E tests passing
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Ready to deploy to production with `sam deploy --config-env production`

### Rollback Plan

**If something goes wrong during deployment:**

1. **Before deleting old tables** - Keep old tables temporarily:
   - Don't remove `StudentsTable` and `CoursesTable` from template initially
   - Deploy with both old and new tables coexisting
   - Verify everything works with EducationTable
   - Then remove old tables in subsequent deployment

2. **If errors occur after deletion:**
   - Redeploy previous SAM template version (revert commit)
   - Old tables will be recreated (but empty)
   - Need to restore from backup if data existed

3. **For this implementation (no existing users):**
   - Rollback is simple: redeploy previous template
   - No data loss concerns

---

## Testing Strategy

### Unit Tests

**Backend:**
- `enrollment.repository.test.ts` - Test DynamoDB operations (create, get, query)
- `enrollment.service.test.ts` - Test business logic and strategy selection
- `free-enrollment.strategy.test.ts` - Test free enrollment logic
- `enrollment.routes.test.ts` - Test API endpoints with mocked service

**Frontend:**
- `enrollment.test.ts` - Test enrollment server actions
- `CoursePlayer.test.tsx` - Test course player component rendering and navigation
- `DashboardEnrollmentHandler.test.tsx` - Test enrollment hook logic
- `DashboardContent.test.tsx` - Test dashboard rendering with/without enrollments

### Integration Tests

**Backend API:**
```bash
# Test enrollment creation
curl -X POST http://localhost:8080/api/enrollments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"courseId": "course-001"}'

# Test idempotency (run same request twice)
curl -X POST http://localhost:8080/api/enrollments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"courseId": "course-001"}'

# Test get enrollments
curl http://localhost:8080/api/enrollments \
  -H "Authorization: Bearer <token>"

# Test enrollment check
curl http://localhost:8080/api/enrollments/check/course-001 \
  -H "Authorization: Bearer <token>"
```

### E2E Tests

**Test Scenarios:**
1. Complete enrollment flow (signup → enroll → access course)
2. Protected route access (unauthenticated users redirected)
3. Enrollment verification (unenrolled users redirected)
4. Dashboard display (enrolled courses shown)
5. Course player navigation (curriculum interaction)
6. Idempotent enrollment (duplicate requests handled)

**E2E Test Files:**
- `e2e/tests/enrollment-flow.spec.ts` - Complete enrollment journey
- `e2e/tests/dashboard-enrollments.spec.ts` - Dashboard enrollment display
- `e2e/tests/protected-course-access.spec.ts` - Route protection

### Manual Testing Checklist

**Enrollment Flow:**
- [ ] Landing page loads with "Enroll Now" button
- [ ] Clicking "Enroll Now" navigates to `/enroll?courseid=course-001`
- [ ] Signup form captures `courseid` from URL
- [ ] Verification email page shows correct email and retains `courseid`
- [ ] Signin page stores `courseid` in sessionStorage
- [ ] Dashboard processes pending enrollment on first load
- [ ] Enrolled course appears in dashboard with correct details
- [ ] "Continue Learning" button navigates to `/learn/course-001`

**Protected Access:**
- [ ] Accessing `/learn/course-001` without auth redirects to signin
- [ ] Accessing `/learn/course-001` without enrollment redirects to course detail
- [ ] Accessing `/learn/course-001` with enrollment shows course player

**Course Player:**
- [ ] Course name and instructor displayed
- [ ] Progress bar shows correct percentage
- [ ] Video placeholder visible
- [ ] Curriculum sidebar shows all modules and topics
- [ ] Clicking topics navigates to correct lesson
- [ ] Previous/Next buttons work correctly
- [ ] Current lesson highlighted in curriculum

**Data Integrity:**
- [ ] Enrollment record created in EducationTable with correct PK/SK
- [ ] Duplicate enrollment attempts return existing enrollment
- [ ] GSI1 allows reverse queries (get students enrolled in course)

## Performance Considerations

### Database Query Optimization
- **Single-table design** minimizes cross-table joins
- **GSI1** enables efficient bidirectional queries without multiple database calls
- **GetItem** for enrollment checks (fast point queries) instead of Scan
- **Query** for user enrollments (single query vs multiple GetItems)

### Frontend Performance
- **Server components** for data fetching (reduces client bundle size)
- **Server actions** for mutations (reduces client-side API call code)
- **Progress tracking** uses local state (no backend calls during navigation)
- **Course player** lazy loads curriculum items for large courses

### Caching Strategy
- **Session tokens** cached in NextAuth JWT (no repeated Cognito calls)
- **Course data** can be cached in Redis (future enhancement)
- **Enrollment checks** can use short-lived cache (e.g., 5 minutes)

## Migration Notes

### Complete Clean Implementation
This implementation represents a **complete migration** to single-table design and feature-based architecture. All legacy tables, routes, and models have been removed and replaced with modern patterns.

**What Changed:**

1. **Database Architecture:**
   - **DELETED**: `StudentsTable` (old separate table)
   - **DELETED**: `CoursesTable` (old separate table)
   - **NEW**: `EducationTable` (single table for all entities)
   - All data now uses adjacency list pattern with PK/SK and GSI1

2. **Backend Structure:**
   - **DELETED**: `backend/src/routes/students.ts` (old route structure)
   - **DELETED**: `backend/src/models/student.ts` (old model structure)
   - **NEW**: Feature-based architecture in `backend/src/features/`
     - `features/students/` - Student management
     - `features/courses/` - Course management
     - `features/enrollment/` - Enrollment logic

3. **Code Patterns:**
   - **OLD**: Direct DynamoDB operations with simple keys
   - **NEW**: Repository pattern with single-table design
   - **NEW**: Strategy pattern for enrollment types
   - **NEW**: Service layer for business logic

**Rationale:**
- Single-table DynamoDB design provides better scalability and query flexibility
- Enrollment records support rich metadata (payment status, progress, completion)
- Adjacency list pattern with GSI enables efficient bidirectional queries
- Strategy pattern supports multiple enrollment types (free, paid, bundles)
- Feature-based structure improves code organization and maintainability

**No Backward Compatibility:**
- This is a clean slate implementation
- All code migrated to new patterns
- No legacy table dependencies remain
- Perfect time for clean architecture with no users on the service

## References

- **Main Spec**: `specs/student_enrollment/slices/enrollment/single-course-free-enrollment.md`
- **Research Document**: `specs/student_enrollment/slices/enrollment/spike-research.md`
- **Similar Pattern**: Student onboarding at `backend/src/lambdas/student-onboarding.ts:33`
- **Route Pattern**: Student routes at `backend/src/routes/students.ts:8`
- **Auth Pattern**: Dashboard protection at `frontend/auth.config.ts:9-30`
- **Strategy Pattern**: [FreeCodeCamp Guide](https://www.freecodecamp.org/news/a-beginners-guide-to-the-strategy-design-pattern/)
- **Single-Table DynamoDB**: [AWS re:Post Article](https://repost.aws/articles/ARs-sKseqITnWrHjMvYzLk7w)
- **NextAuth.js**: [NextAuth Documentation](https://next-auth.js.org/)

---

## Summary

This implementation plan provides a complete roadmap for implementing single free course enrollment while **completely migrating** the LearnerMax application to modern single-table DynamoDB design and feature-based architecture. The plan:

1. **Migrates to Single-Table Design**: Creates `EducationTable` to replace separate Students and Courses tables
2. **Implements Feature-Based Architecture**: Migrates all backend code to `src/features/` structure
3. **Builds Enrollment System**: Implements enrollment service with Strategy pattern
4. **Captures Course Intent**: Modifies signup flow to persist courseId through authentication
5. **Integrates Frontend**: Updates dashboard to display enrollments and trigger auto-enrollment
6. **Protects Course Access**: Creates course player with authentication and enrollment checks
7. **Removes Legacy Infrastructure**: Deletes old tables, routes, and models completely
8. **Validates Implementation**: Provides comprehensive testing strategy

**Key Architectural Improvements:**
- **Single-table DynamoDB** with adjacency list pattern for efficient queries
- **Feature-based backend** with clear separation of concerns
- **Repository pattern** for data access abstraction
- **Strategy pattern** for extensible enrollment types
- **No backward compatibility burden** - clean slate implementation

The architecture is designed for extensibility - adding paid courses or bundles requires only implementing new strategy classes without modifying existing code. The single-table design scales efficiently, supporting complex queries with GSI indexes, and the feature-based structure keeps code organized as the platform grows.

**This plan transforms the codebase** from legacy multi-table design to modern single-table architecture while delivering the enrollment feature.