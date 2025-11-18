# Slice 3.2: Early Access Backend

**Parent Mainspec:** `specs/premium_course_teaser/mainspec.md`
**Status:** Not Started
**Depends On:** Slice 3.1 (Premium Course Placeholder - course must exist)

## Objective
Add `interestedInPremium` field to Student entity and create an API endpoint that allows authenticated students to sign up for early access to the premium course. This captures leads for the premium course launch.

## What We're Doing

### 1. Extend Student Entity

**Update:** `backend/src/features/students/student.types.ts`

Add two new optional fields to the Student interface:

```typescript
export interface Student {
  PK: string;                    // "STUDENT#<userId>"
  SK: string;                    // "PROFILE"
  studentId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;

  // NEW: Premium early access fields
  interestedInPremium?: boolean;    // True if signed up for early access
  premiumInterestDate?: string;     // ISO timestamp when they signed up
}
```

**Why these fields:**
- `interestedInPremium`: Boolean flag for quick filtering of interested students
- `premiumInterestDate`: Timestamp for tracking when interest was expressed (useful for analytics and follow-up timing)

### 2. Create Early Access API Endpoint

**Update:** `backend/src/features/students/student.routes.ts`

Add the early access endpoint to the existing student routes file. The student routes are already registered in `backend/src/app.ts` at line 32: `app.use('/api/students', studentRoutes)`.

```typescript
import { z } from 'zod';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Add validation schema at top of file
const earlyAccessSchema = z.object({
  courseId: z.string().min(1)
});

// Add this route after the existing routes
/**
 * POST /api/students/early-access
 * Mark current student as interested in premium course
 */
router.post('/early-access', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { courseId } = earlyAccessSchema.parse(req.body);

    // Update student record
    const command = new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        PK: `STUDENT#${userId}`,
        SK: 'PROFILE'
      },
      UpdateExpression: 'SET interestedInPremium = :interested, premiumInterestDate = :date, updatedAt = :updated',
      ExpressionAttributeValues: {
        ':interested': true,
        ':date': new Date().toISOString(),
        ':updated': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    });

    const client = DynamoDBDocumentClient.from(studentService.getClient());
    const result = await client.send(command);
    const student = result.Attributes;

    res.json({
      success: true,
      message: "You're on the early access list!",
      student: {
        studentId: student.studentId,
        interestedInPremium: student.interestedInPremium,
        premiumInterestDate: student.premiumInterestDate
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      });
      return;
    }
    logger.error('Error marking early access interest', { error });
    res.status(500).json({ error: 'Failed to process early access signup' });
  }
});
```

### 3. Frontend Types and Server Action

**Create:** `frontend/app/actions/students.ts`

Following the pattern established in `enrollments.ts` and `courses.ts`, create a new actions file for student operations:

```typescript
'use server';

import { getAuthToken } from './auth';

function getApiUrl(): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!API_URL) {
    console.error('[getApiUrl] NEXT_PUBLIC_API_URL environment variable is not set');
    throw new Error('API URL not configured. Please contact support.');
  }
  return API_URL;
}

/**
 * Student record with early access fields
 */
export interface Student {
  studentId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  interestedInPremium?: boolean;
  premiumInterestDate?: string;
}

/**
 * Result type for early access signup
 */
export interface EarlyAccessResult {
  success: boolean;
  message?: string;
  student?: Partial<Student>;
  error?: string;
}

/**
 * Sign up for early access to a premium course
 *
 * @param courseId - The ID of the premium course
 * @returns EarlyAccessResult with success status and student data
 */
export async function signUpForEarlyAccess(courseId: string): Promise<EarlyAccessResult> {
  console.log('[signUpForEarlyAccess] Starting signup for courseId:', courseId);

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[signUpForEarlyAccess] No auth token available');
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    console.log('[signUpForEarlyAccess] ID token obtained, length:', token.length);
    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/students/early-access`;
    console.log('[signUpForEarlyAccess] Calling endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId }),
    });

    console.log('[signUpForEarlyAccess] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[signUpForEarlyAccess] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      return {
        success: false,
        error: errorData.error || `Failed to sign up: ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log('[signUpForEarlyAccess] Signup successful:', data);

    return {
      success: true,
      message: data.message,
      student: data.student,
    };
  } catch (error) {
    console.error('[signUpForEarlyAccess] Exception occurred:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
```

## What We're NOT Doing
- No email campaign integration (Phase 4 handles transactional emails only)
- No analytics tracking of signup source
- No ability to opt-out once signed up (can add later if needed)
- No validation that courseId is actually a premium course
- No duplicate signup prevention (idempotent - multiple clicks OK)

## Acceptance Criteria

### Backend Student Type Extension
- [ ] `interestedInPremium` field added to Student interface
- [ ] `premiumInterestDate` field added to Student interface
- [ ] Both fields are optional (existing students unaffected)

### Early Access API Endpoint
- [ ] POST `/api/students/early-access` endpoint created in existing routes file
- [ ] Requires authentication (401 if not authenticated)
- [ ] Validates request body with Zod schema
- [ ] Updates student record with both new fields
- [ ] Returns success response with student data
- [ ] Handles errors gracefully (400 for validation, 500 for server errors)

### Frontend Integration
- [ ] `frontend/app/actions/students.ts` file created
- [ ] `Student` interface matches backend type structure
- [ ] `EarlyAccessResult` type defined for return values
- [ ] `signUpForEarlyAccess()` server action implemented
- [ ] Uses `getAuthToken()` for authentication
- [ ] Follows logging pattern from other action files
- [ ] Error handling matches pattern from `enrollments.ts`

### API Testing
- [ ] Can sign up while authenticated
- [ ] Returns 401 when not authenticated
- [ ] Returns 400 with invalid courseId (empty string)
- [ ] Multiple signups are idempotent (no errors)
- [ ] `interestedInPremium` set to true after signup
- [ ] `premiumInterestDate` has valid ISO timestamp

### Data Integrity
- [ ] Student record not duplicated
- [ ] Existing student fields unchanged
- [ ] Timestamp in ISO 8601 format
- [ ] `updatedAt` field updated on change

## Forward-Looking Requirements

### For Slice 3.3 (Dashboard Premium Card)
- Frontend will check `interestedInPremium` to show different CTA
- If true: "You're on the list!" message
- If false: "Join Early Access" button

### For Slice 3.5 (Completion Upsell Modal)
- Modal will call `signUpForEarlyAccess()` when user clicks button
- Show success message after signup
- Disable button if already signed up

### For Future Launch (Post-MVP)
**Query early access leads when ready to launch:**
```typescript
// Example: Get all students interested in premium
const command = new ScanCommand({
  TableName: process.env.TABLE_NAME,
  FilterExpression: 'interestedInPremium = :interested',
  ExpressionAttributeValues: {
    ':interested': true
  }
});
```

Then send launch announcement emails to these leads.

## Verification Steps

After implementing:

1. **Test signup via API:**
   ```bash
   # Get auth token first
   TOKEN=$(curl -X POST https://api.learnermax.com/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!"}' \
     | jq -r '.token')

   # Sign up for early access
   curl -X POST https://api.learnermax.com/api/students/early-access \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"courseId":"premium-spec-course"}'
   ```

   Expected response:
   ```json
   {
     "success": true,
     "message": "You're on the early access list!",
     "student": {
       "studentId": "student-123",
       "interestedInPremium": true,
       "premiumInterestDate": "2025-01-15T14:30:00Z"
     }
   }
   ```

2. **Verify DynamoDB:**
   ```bash
   aws dynamodb get-item \
     --table-name learnermax-courses \
     --key '{"PK":{"S":"STUDENT#<userId>"},"SK":{"S":"PROFILE"}}'
   ```

   Should show:
   ```json
   {
     "Item": {
       "PK": {"S": "STUDENT#user-123"},
       "SK": {"S": "PROFILE"},
       "interestedInPremium": {"BOOL": true},
       "premiumInterestDate": {"S": "2025-01-15T14:30:00Z"},
       ...
     }
   }
   ```

3. **Test error cases:**
   ```bash
   # Without auth token → 401
   curl -X POST https://api.learnermax.com/api/students/early-access \
     -H "Content-Type: application/json" \
     -d '{"courseId":"premium-spec-course"}'

   # Invalid request body → 400
   curl -X POST https://api.learnermax.com/api/students/early-access \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"courseId":""}'

   # Multiple signups → Should be idempotent (no error)
   curl -X POST https://api.learnermax.com/api/students/early-access \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"courseId":"premium-spec-course"}'
   ```

## User Flow Narrative

**Scenario: Student completes mini course and signs up for early access**

1. **Context:** Sarah just finished the last lesson of the free mini course. Confetti animation appears celebrating 100% completion.

2. **Modal appears:** After 3 seconds, the `PremiumUpsellModal` component displays:
   ```
   "Ready to take your skills to the next level?"

   Advanced Spec-Driven Development Mastery
   Coming Soon

   [Join Early Access] button
   ```

3. **User action:** Sarah clicks "Join Early Access" button.

4. **Frontend:** Button triggers:
   ```typescript
   const result = await signUpForEarlyAccess('premium-spec-course');
   ```

5. **Backend processing:**
   - Validates Sarah is authenticated ✓
   - Validates courseId is provided ✓
   - Updates Student record:
     ```typescript
     {
       PK: "STUDENT#user-789",
       SK: "PROFILE",
       interestedInPremium: true,
       premiumInterestDate: "2025-01-15T16:45:00Z",
       updatedAt: "2025-01-15T16:45:00Z"
     }
     ```

6. **Success response:** Backend returns:
   ```json
   {
     "success": true,
     "message": "You're on the early access list!",
     "student": { ... }
   }
   ```

7. **Frontend feedback:** Modal updates to show:
   ```
   ✓ You're on the list!
   We'll notify you when it launches.
   ```

8. **Future visit:** Next time Sarah sees the premium course card on dashboard, it shows:
   ```
   Advanced Spec-Driven Development Mastery
   Coming Soon
   ✓ You're on the early access list
   ```

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May add courseId validation (check if course exists)
- May track signup source (modal vs dashboard vs in-course banner)
- May add opt-out endpoint later
- May need to prevent signups for non-premium courses
