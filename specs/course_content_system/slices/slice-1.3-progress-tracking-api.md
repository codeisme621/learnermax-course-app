# Slice 1.3: Progress Tracking API

**Parent Mainspec:** `specs/course_content_system/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 1.1 (Type System - needs `ProgressEntity`, `LessonEntity` schemas)
- Slice 1.2 (Video Infrastructure - needs signed URL service)

## Objective
Build backend API endpoints for managing student course progress and serving course lessons with signed video URLs. This includes lesson retrieval, progress saving, and progress querying.

## User Flow Narrative

**Student discovers course lessons:**
1. Student lands on `/course/spec-driven-dev-mini` (already enrolled)
2. Frontend calls `GET /api/courses/spec-driven-dev-mini/lessons`
3. Backend queries DynamoDB → Returns 5 lessons with `order`, `title`, `lengthInMins`
4. Frontend also calls `GET /api/progress/spec-driven-dev-mini`
5. Backend returns `{ completedLessons: ["lesson-1"], percentage: 20, lastAccessedLesson: "lesson-1" }`
6. Frontend displays lesson list with lesson-1 checked, lesson-2 highlighted as "Resume here"

**Student watches a lesson:**
1. Student clicks "Lesson 2: Writing Your First Spec"
2. Frontend calls `GET /api/lessons/lesson-2/video-url`
3. Backend verifies enrollment → Generates signed CloudFront URL → Returns `{ videoUrl: "https://...", expiresAt: 1234567890 }`
4. Frontend loads video player with signed URL
5. Student watches video to 90% completion
6. Frontend calls `POST /api/progress` with `{ courseId: "spec-driven-dev-mini", lessonId: "lesson-2", completed: true }`
7. Backend adds "lesson-2" to `completedLessons` array → Recalculates percentage (40%) → Saves to DynamoDB
8. Backend returns updated progress: `{ completedLessons: ["lesson-1", "lesson-2"], percentage: 40, ... }`
9. Frontend updates UI: Shows checkmark on lesson-2, updates progress bar to 40%

**Key design decisions from flow:**
- Percentage calculated **on write** (student needs immediate UI feedback)
- Completion is **one-way** (no undo - once watched, stays completed)
- Video URL requires **enrollment verification** (security check before signing)
- `lastAccessedLesson` updated every time progress is saved (for "Resume" feature)

## What We're Doing

### 1. Lessons API Endpoints
**New file:** `backend/src/features/lessons/lessons.routes.ts`

**GET /api/courses/:courseId/lessons**
- Returns all lessons for a course (ordered by `order` field)
- Does NOT include signed video URLs (too expensive to generate for all lessons)
- Optionally includes student's completion status if authenticated

**Request:**
```typescript
GET /api/courses/spec-driven-dev-mini/lessons
Headers: Authorization: Bearer <token>
```

**Response:**
```typescript
{
  "lessons": [
    {
      "lessonId": "lesson-1",
      "courseId": "spec-driven-dev-mini",
      "title": "Introduction to Spec-Driven Development",
      "description": "Learn the fundamentals...",
      "lengthInMins": 15,
      "order": 1
    },
    {
      "lessonId": "lesson-2",
      "courseId": "spec-driven-dev-mini",
      "title": "Writing Your First Spec",
      "lengthInMins": 20,
      "order": 2
    }
  ],
  "totalLessons": 5
}
```

**Note:** `isCompleted` field NOT included here (frontend merges with progress data client-side)

**Security Note:** The API response MUST NOT include the `videoKey` field. This field is an internal S3 object key used only by the backend to generate signed URLs. The frontend should never see S3 keys - only signed CloudFront URLs returned by the dedicated video URL endpoint below.

**GET /api/lessons/:lessonId/video-url**
- Returns signed CloudFront URL for a specific lesson video
- Requires student to be enrolled in the lesson's course (security check)
- URL expires after 30 minutes

**Request:**
```typescript
GET /api/lessons/lesson-2/video-url
Headers: Authorization: Bearer <token>
```

**Response:**
```typescript
{
  "videoUrl": "https://d123.cloudfront.net/courses/spec-driven-dev-mini/lesson-2.mp4?Signature=...",
  "expiresAt": 1234567890  // Unix timestamp
}
```

**Error cases:**
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Not enrolled in course
- 404 Not Found: Lesson doesn't exist

### 2. Progress API Endpoints
**New file:** `backend/src/features/progress/progress.routes.ts`

**GET /api/progress/:courseId**
- Returns student's progress for a specific course
- If no progress exists, returns default: `{ completedLessons: [], percentage: 0, ... }`

**Request:**
```typescript
GET /api/progress/spec-driven-dev-mini
Headers: Authorization: Bearer <token>
```

**Response:**
```typescript
{
  "courseId": "spec-driven-dev-mini",
  "completedLessons": ["lesson-1", "lesson-2"],
  "lastAccessedLesson": "lesson-2",
  "percentage": 40,
  "totalLessons": 5,
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**POST /api/progress**
- Marks a lesson as complete
- Updates `completedLessons` array (deduplicated)
- Recalculates and stores `percentage` in DynamoDB
- Updates `lastAccessedLesson`

**Request:**
```typescript
POST /api/progress
Headers: Authorization: Bearer <token>
Content-Type: application/json

{
  "courseId": "spec-driven-dev-mini",
  "lessonId": "lesson-2"
}
```

**Response:**
```typescript
{
  "courseId": "spec-driven-dev-mini",
  "completedLessons": ["lesson-1", "lesson-2"],
  "lastAccessedLesson": "lesson-2",
  "percentage": 40,
  "totalLessons": 5,
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

**Business logic:**
- Add `lessonId` to `completedLessons` array (deduplicated with Set)
- Update `lastAccessedLesson` to current `lessonId`
- Query total lessons for course: `totalLessons = await getTotalLessons(courseId)`
- Calculate percentage: `percentage = Math.round((completedLessons.length / totalLessons) * 100)`
- Store `percentage` in DynamoDB (for quick access on GET)
- Return updated progress to frontend

**Note:** Completion is one-way. No API to "uncomplete" a lesson (simpler UX).

### 3. Service Layer
**New file:** `backend/src/features/lessons/services/lesson.service.ts`

**Key methods:**
```typescript
class LessonService {
  async getLessonsByCourse(courseId: string): Promise<Lesson[]>;
  async getLesson(lessonId: string): Promise<Lesson | null>;
  async getTotalLessons(courseId: string): Promise<number>;
}
```

**DynamoDB queries:**
```typescript
// getLessonsByCourse
Query: PK = "COURSE#<courseId>" AND SK begins_with "LESSON#"
Sort: By SK (which includes order in lesson ID, or sort in-memory by `order` field)

// getTotalLessons
Query: PK = "COURSE#<courseId>" AND SK begins_with "LESSON#"
Return: items.length
```

**New file:** `backend/src/features/progress/services/progress.service.ts`

**Key methods:**
```typescript
class ProgressService {
  async getProgress(studentId: string, courseId: string): Promise<Progress>;
  async markLessonComplete(studentId: string, courseId: string, lessonId: string): Promise<Progress>;
}
```

**Progress update logic:**
```typescript
async markLessonComplete(studentId: string, courseId: string, lessonId: string): Promise<Progress> {
  // 1. Get existing progress (or create empty)
  const existing = await this.getProgress(studentId, courseId) || {
    completedLessons: [],
    percentage: 0,
  };

  // 2. Add lesson to completed (deduplicate with Set)
  const completedSet = new Set(existing.completedLessons);
  completedSet.add(lessonId);
  const completedLessons = Array.from(completedSet);

  // 3. Get total lessons and calculate percentage
  const totalLessons = await lessonService.getTotalLessons(courseId);
  const percentage = Math.round((completedLessons.length / totalLessons) * 100);

  // 4. Update DynamoDB
  const updated = await this.updateProgress({
    PK: `STUDENT#${studentId}`,
    SK: `PROGRESS#${courseId}`,
    completedLessons,
    lastAccessedLesson: lessonId,
    percentage,
    updatedAt: new Date().toISOString(),
  });

  return updated;
}
```

### 4. Authorization & Validation
**Middleware:**
- All endpoints require authentication (existing `requireAuth` middleware)
- Video URL endpoint requires enrollment check (prevent unauthorized video access)

**Enrollment verification:**
```typescript
// In GET /api/lessons/:lessonId/video-url route handler
const lesson = await lessonService.getLesson(lessonId);
if (!lesson) {
  return res.status(404).json({ error: 'Lesson not found' });
}

const isEnrolled = await enrollmentService.checkEnrollment(studentId, lesson.courseId);
if (!isEnrolled) {
  return res.status(403).json({ error: 'Not enrolled in this course' });
}

// Generate signed URL only after enrollment verified
const { url, expiresAt } = await videoUrlProvider.generateSignedUrl(lesson.videoKey);
```

**Input validation:**
```typescript
// POST /api/progress validation
const schema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
});
```

## What We're NOT Doing
- No "uncomplete" lesson feature (completion is one-way)
- No video player component (Slice 1.4)
- No UI updates (Slice 1.5)
- No lesson creation API (lessons created manually/scripts in Phase 2)
- No video analytics (watch time, pause events, completion percentage within video)
- No quiz or assessment integration
- No certificate generation on course completion

## Acceptance Criteria

### API Endpoints
- [ ] `GET /api/courses/:courseId/lessons` returns lessons ordered by `order` field
- [ ] `GET /api/lessons/:lessonId/video-url` returns signed CloudFront URL
- [ ] `GET /api/progress/:courseId` returns progress or default empty state
- [ ] `POST /api/progress` marks lesson complete and returns updated progress
- [ ] All endpoints require authentication
- [ ] Video URL endpoint verifies enrollment before generating URL

### Service Layer
- [ ] `LessonService.getLessonsByCourse()` queries DynamoDB, returns ordered lessons
- [ ] `LessonService.getTotalLessons()` returns count of lessons for course
- [ ] `ProgressService.markLessonComplete()` updates progress in DynamoDB
- [ ] Progress percentage calculated eagerly on write
- [ ] `completedLessons` array deduplicated (no duplicate lesson IDs)
- [ ] `lastAccessedLesson` always updated to most recent lesson

### Integration with Video Infrastructure
- [ ] Video URL endpoint calls `VideoUrlProvider.generateSignedUrl()`
- [ ] Signed URLs expire after 30 minutes
- [ ] Returns both `videoUrl` and `expiresAt` fields

**Environment Configuration (from Slice 1.2):**
The `VideoUrlProvider` is already configured via Lambda environment variables set up in Slice 1.2. No additional environment setup is needed for video URL generation. The factory function `createVideoUrlProvider()` reads from:
- `CLOUDFRONT_DOMAIN` - CloudFront distribution domain (auto-populated from stack outputs)
- `CLOUDFRONT_KEY_PAIR_ID` - Contains Public Key ID for KeyGroups (not legacy Key Pair ID despite the name)
- `CLOUDFRONT_PRIVATE_KEY_SECRET_NAME` - Secrets Manager secret name (environment-specific: `learnermax/cloudfront-private-key-${Environment}`)
- `VIDEO_URL_EXPIRY_MINUTES` - URL expiration time (configured as 30 minutes)

**Usage in route handler:**
```typescript
import { createVideoUrlProvider } from '../lessons/services/video-url-service.js';

// In GET /api/lessons/:lessonId/video-url handler
const videoUrlProvider = createVideoUrlProvider(); // Reads from env vars automatically
const { url, expiresAt } = await videoUrlProvider.generateSignedUrl(lesson.videoKey);
```

### Error Handling
- [ ] 401 if not authenticated
- [ ] 403 if not enrolled (video URL endpoint)
- [ ] 404 if course/lesson not found
- [ ] 400 for invalid request body
- [ ] Proper error messages in JSON response

### Testing
- [ ] Unit tests for `ProgressService.markLessonComplete()` logic
- [ ] Unit tests for percentage calculation (edge cases: 0%, 100%)
- [ ] Integration tests for each API endpoint
- [ ] E2E test: Fetch lessons → Get video URL → Mark complete → Verify progress updated

## Do / Don't Examples

### DO: Deduplicate Completed Lessons with Set
```typescript
// ✅ GOOD: Prevent duplicate lesson IDs in array
const completedSet = new Set(progress.completedLessons);
completedSet.add(lessonId);
const uniqueCompleted = Array.from(completedSet);
```

### DON'T: Push Without Checking Duplicates
```typescript
// ❌ BAD: Can result in ["lesson-1", "lesson-1", "lesson-2"]
progress.completedLessons.push(lessonId);
```

### DO: Verify Enrollment Before Serving Video URL
```typescript
// ✅ GOOD: Security check prevents unauthorized access
const lesson = await getLesson(lessonId);
const isEnrolled = await checkEnrollment(studentId, lesson.courseId);
if (!isEnrolled) {
  return res.status(403).json({ error: 'Not enrolled' });
}
const signedUrl = await generateSignedUrl(lesson.videoKey);
```

### DON'T: Serve Video URLs Without Authorization
```typescript
// ❌ BAD: Anyone with lessonId can get video URL
const lesson = await getLesson(lessonId);
const signedUrl = await generateSignedUrl(lesson.videoKey);
return res.json({ videoUrl: signedUrl });
```

### DO: Calculate and Store Percentage on Write
```typescript
// ✅ GOOD: Immediate feedback for frontend, stored for fast reads
const totalLessons = await getTotalLessons(courseId);
const percentage = Math.round((completedLessons.length / totalLessons) * 100);
await updateProgress({ completedLessons, percentage });  // Store both
return { completedLessons, percentage };  // Frontend gets updated value
```

### DON'T: Calculate Percentage Only on Read
```typescript
// ❌ BAD: POST /api/progress response doesn't include percentage, frontend must refetch
await updateProgress({ completedLessons });  // No percentage stored
return { completedLessons };  // Frontend missing percentage, needs another API call
```

### DO: Return Total Lessons with Progress
```typescript
// ✅ GOOD: Frontend can show "2 of 5 lessons complete"
return {
  completedLessons: ["lesson-1", "lesson-2"],
  percentage: 40,
  totalLessons: 5  // Frontend needs this for display
};
```

### DON'T: Return Only Completed Count
```typescript
// ❌ BAD: Frontend doesn't know denominator
return {
  completedLessons: ["lesson-1", "lesson-2"],
  percentage: 40
  // Missing totalLessons!
};
```

## Forward-Looking Requirements

### For Slice 1.4 (Video Player Component)
**Video URL fetching flow:**
- When user clicks lesson → Frontend calls `GET /api/lessons/:lessonId/video-url`
- Frontend should check `expiresAt` timestamp
- If URL expires soon (< 2 minutes remaining), refetch new URL

**Progress tracking trigger:**
- When video reaches 90% watched → Call `POST /api/progress`
- Debounce: Don't call more than once per 30 seconds per lesson

### For Slice 1.5 (Course Lesson UI)
**Lesson list display:**
- On page load: Call `GET /api/courses/:courseId/lessons` and `GET /api/progress/:courseId`
- Merge `completedLessons` array with lessons to show checkmarks
- Highlight lesson matching `lastAccessedLesson` as "Resume here"
- Display progress bar using `percentage` field

### For Phase 3 (Premium Upsell Modal)
**Course completion detection:**
- Check if `percentage === 100` in progress response
- Trigger completion event → Show upsell modal for premium course
- Consider: Should `POST /api/progress` return `{ courseCompleted: true }` flag?

### For Future Analytics
Progress entity can be extended with:
- `startedAt: string` - ISO timestamp when first lesson accessed
- `completedAt?: string` - ISO timestamp when percentage hit 100%
- `watchTimeSeconds?: number` - Total seconds watched across all lessons
- `lastActiveAt: string` - Timestamp of last progress update (for engagement tracking)

## DynamoDB Access Patterns

**Lesson queries:**
```typescript
// Get all lessons for a course (ordered)
PK = "COURSE#spec-driven-dev-mini" AND SK begins_with "LESSON#"
// Returns: All lesson items, sort by `order` field

// Get specific lesson by ID (use GSI if courseId unknown)
GSI1PK = "LESSON#lesson-2"
// Returns: Single lesson item

// Get total lessons count
PK = "COURSE#<courseId>" AND SK begins_with "LESSON#"
// Returns: items.length
```

**Progress queries:**
```typescript
// Get student's progress for a course
PK = "STUDENT#student-123" AND SK = "PROGRESS#spec-driven-dev-mini"

// Update progress (upsert with UpdateExpression)
UpdateItem:
  Key: { PK: "STUDENT#student-123", SK: "PROGRESS#spec-driven-dev-mini" }
  UpdateExpression: "SET completedLessons = :cl, percentage = :pct, lastAccessedLesson = :last, updatedAt = :now"
  ExpressionAttributeValues: {
    ":cl": ["lesson-1", "lesson-2"],
    ":pct": 40,
    ":last": "lesson-2",
    ":now": "2025-01-15T14:20:00Z"
  }
```

## API Response Examples

**Successful lesson fetch:**
```json
{
  "lessons": [
    {
      "lessonId": "lesson-1",
      "courseId": "spec-driven-dev-mini",
      "title": "Introduction to Spec-Driven Development",
      "description": "Learn why specs matter when working with AI coding agents",
      "lengthInMins": 15,
      "order": 1
    },
    {
      "lessonId": "lesson-2",
      "courseId": "spec-driven-dev-mini",
      "title": "Writing Your First Spec",
      "lengthInMins": 20,
      "order": 2
    }
  ],
  "totalLessons": 5
}
```

**Successful video URL fetch:**
```json
{
  "videoUrl": "https://d1a2b3c4.cloudfront.net/courses/spec-driven-dev-mini/lesson-1.mp4?Expires=1736943600&Signature=abc123&Key-Pair-Id=APKAI...",
  "expiresAt": 1736943600
}
```

**Progress after marking lesson complete:**
```json
{
  "courseId": "spec-driven-dev-mini",
  "completedLessons": ["lesson-1", "lesson-2", "lesson-3"],
  "lastAccessedLesson": "lesson-3",
  "percentage": 60,
  "totalLessons": 5,
  "updatedAt": "2025-01-15T14:20:00Z"
}
```

**Error response (not enrolled):**
```json
{
  "error": "Not enrolled in this course",
  "code": "ENROLLMENT_REQUIRED"
}
```

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May cache `totalLessons` in Course entity (avoid count query on every progress update)
- May add rate limiting on video URL endpoint (prevent URL generation abuse)
- May add CDN caching for lesson list (lessons rarely change)
