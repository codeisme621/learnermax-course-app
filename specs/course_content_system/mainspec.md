# Feature - Course Content System with Video Infrastructure

## Background
The LearnerMax application currently has course enrollment working, but the course experience (`/course/[courseId]`) shows only placeholder video players and mock curriculum data. For the MVP, we need a fully functional course backend that:
- Displays real course lessons (not mock modules)
- Plays videos from S3/CloudFront with encryption protection
- Tracks student progress (lesson completion, course percentage, last accessed)
- Provides seamless resume-watching experience

This system will power the free mini course on "Spec-Driven Development with Context Engineering" and be extensible for future premium courses with modular structure.

## User Story
As a student who has enrolled in a course, after logging in I want to see a clear list of lessons in the course. When I click on a lesson, I expect a video player to load and play the lesson video seamlessly. As I watch videos, the system should track which lessons I've completed and show my overall progress. When I return to the course later, I should be able to resume where I left off - the system should remember my last accessed lesson and show my completion status.

The video player should feel professional and secure - I shouldn't be able to easily download videos or share direct video URLs. The system should use CloudFront signed URLs that expire, preventing unauthorized access.

## What We're Building
1. **Type System Updates** - Rename `CourseVideo` → `Lesson` with semantic field names for clarity
2. **Backend Course Content Data Model** - Lesson entity in DynamoDB with curriculum structure
3. **Backend Video Infrastructure** - S3/CloudFront integration with signed URL generation
4. **Backend Progress Tracking API** - Endpoints to save/retrieve lesson completion and course progress
5. **Frontend Video Player** - React component that plays CloudFront videos and tracks watch events
6. **Frontend Course Lesson UI** - Replace mock data with real lesson fetching and display

## What We're NOT Building
- Video upload interface (videos will be manually uploaded via AWS Console)
- Course creation UI (courses/lessons will be created via API/scripts)
- Quiz or assessment features
- Certificate generation
- Video transcoding or adaptive bitrate streaming (use pre-encoded videos)
- Comments or discussion forums
- Live streaming or scheduled content
- Module hierarchy (mini course will use flat lesson list; modules will be used in future courses)

## Tech Details

### Architecture
**Current State (Today):**
- Type system uses `CourseVideo` with generic naming (`videoId`, `videoPath`)
- `frontend/app/course/[courseId]/page.tsx` has hardcoded `mockModules` array
- No video player, just placeholder div
- No progress tracking
- No lesson data in DynamoDB
- Course has `curriculum: CourseModule[]` but it's not populated

**Future State (After This Mainspec):**
- Type system uses `Lesson` with semantic naming (`lessonId`, `videoKey`)
- `CourseModule.videos` renamed to `CourseModule.lessons`
- Lesson entity in DynamoDB: `PK: COURSE#<courseId>`, `SK: LESSON#<lessonId>`
- S3 bucket for video storage with CloudFront distribution
- Backend API endpoints: `GET /courses/:courseId/lessons`, `GET /lessons/:lessonId/video-url`, `POST /progress`, `GET /progress/:courseId`
- Frontend fetches real lesson data and displays with functional video player
- Progress tracked in DynamoDB: `PK: STUDENT#<studentId>`, `SK: PROGRESS#<courseId>`

### Technology Stack
- **Video Storage**: AWS S3 (manually uploaded .mp4 files)
- **Video Delivery**: AWS CloudFront with signed URLs (30-minute expiration)
- **Video Player**: `@vidstack/react` or `react-player` (decide in implementation)
- **Progress Storage**: DynamoDB (leverage existing single-table design)
- **API**: Express.js Lambda endpoints (existing pattern)

### Domain Language (Ubiquitous Language)
- **Lesson**: A single video lecture within a course (flat list for mini course; can be nested in modules for future courses)
- **Module**: A grouping of lessons (not used in mini course MVP; will be used in future premium courses)
- **Course**: A collection of lessons or modules
- **Progress**: Student's completion state for a course (lesson completion booleans, overall %, last accessed)
- **Enrollment**: Student's access permission to a course (existing entity, unchanged)
- **Video URL**: Time-limited signed CloudFront URL for secure video delivery

## Architecture Narrative

**Happy Path Story:**
1. Student visits `/course/spec-driven-dev-mini` (already enrolled)
2. Frontend calls `GET /api/courses/spec-driven-dev-mini/lessons` → Backend queries DynamoDB → Returns array of lessons
3. Frontend displays lesson list with titles, durations, completion checkmarks
4. Frontend calls `GET /api/progress/spec-driven-dev-mini` → Backend returns `{ completedLessons: ['lesson-1'], percentage: 20, lastAccessedLesson: 'lesson-1' }`
5. UI shows first uncompleted lesson or last accessed lesson highlighted
6. Student clicks "Lesson 2: Writing Your First Spec"
7. Frontend calls `GET /api/lessons/lesson-2/video-url` → Backend generates CloudFront signed URL → Returns `{ videoUrl: 'https://d123.cloudfront.net/lesson-2.mp4?Signature=...', expiresAt: 1234567890 }`
8. Video player loads and begins playback
9. Student watches video to 90% completion → Frontend calls `POST /api/progress` with `{ lessonId: 'lesson-2', completed: true }` → Backend updates DynamoDB Progress entity
10. UI updates to show lesson 2 completed, overall progress increases to 40%

**Video Security Flow:**
- Videos stored in private S3 bucket (no public access)
- CloudFront distribution uses Origin Access Identity (OAI) to access S3
- Backend Lambda has IAM permissions to generate CloudFront signed URLs
- Signed URLs expire after 30 minutes (configurable)
- Frontend never sees raw S3 URLs, only signed CloudFront URLs

## URL Structure
- `/course/[courseId]` - Main course page showing lesson list and video player
- `/api/courses/:courseId/lessons` - GET endpoint returning lesson array
- `/api/lessons/:lessonId/video-url` - GET endpoint returning signed video URL
- `/api/progress` - POST endpoint to save progress
- `/api/progress/:courseId` - GET endpoint to retrieve progress

## Data Models

### Lesson (Updated Type - details in Slice 1.1)
```typescript
interface Lesson {
  lessonId: string;        // Renamed from videoId
  title: string;
  lengthInMins: number;
  videoKey: string;        // Renamed from videoPath - S3 object key
}
```

### Progress (DynamoDB)
```typescript
interface Progress {
  PK: string;                        // "STUDENT#student-123"
  SK: string;                        // "PROGRESS#spec-driven-dev-mini"
  studentId: string;
  courseId: string;
  completedLessons: string[];        // ["lesson-1", "lesson-2"]
  lastAccessedLesson?: string;
  percentage: number;                // Calculated: completedLessons.length / totalLessons * 100
  updatedAt: string;
}
```

## Do / Don't Examples

### DO: Use Semantic Type Names
```typescript
// ✅ GOOD: Clear, domain-specific naming
interface Lesson {
  lessonId: string;
  videoKey: string;  // S3 key: "courses/spec-driven-dev-mini/lesson-1.mp4"
}

interface CourseModule {
  lessons: Lesson[];  // Clear that modules contain lessons
}
```

### DON'T: Use Generic Video Naming
```typescript
// ❌ BAD: Generic, doesn't reflect domain
interface CourseVideo {
  videoId: string;
  videoPath: string;  // Ambiguous - S3 key? URL? File path?
}

interface CourseModule {
  videos: CourseVideo[];  // Less clear - are these lessons or promotional videos?
}
```

### DO: Use Strategy Pattern for Video URL Generation
```typescript
// backend/src/features/lessons/services/video-url-service.ts
interface VideoUrlProvider {
  generateSignedUrl(videoKey: string): Promise<string>;
}

class CloudFrontUrlProvider implements VideoUrlProvider {
  async generateSignedUrl(videoKey: string): Promise<string> {
    const cloudFrontUrl = `https://${CLOUDFRONT_DOMAIN}/${videoKey}`;
    const signedUrl = getSignedUrl({
      url: cloudFrontUrl,
      keyPairId: CLOUDFRONT_KEY_PAIR_ID,
      privateKey: CLOUDFRONT_PRIVATE_KEY,
      dateLessThan: new Date(Date.now() + 30 * 60 * 1000),
    });
    return signedUrl;
  }
}
```

**Why good:** Strategy pattern allows easy swapping (e.g., Vimeo, Cloudflare Stream) without changing route logic.

### DON'T: Hardcode Video URLs or Expose S3 Directly
```typescript
// ❌ BAD: Never return raw S3 URLs
const videoUrl = `https://learnermax-videos.s3.amazonaws.com/${lesson.videoKey}`;

// ❌ BAD: Don't make S3 bucket public

// ❌ BAD: Don't use long-lived signed URLs (24+ hours)
```

### DO: Track Progress Efficiently (Single Item, Array of Completions)
```typescript
// ✅ GOOD: Single Progress item with array
interface Progress {
  PK: "STUDENT#student-123",
  SK: "PROGRESS#course-123",
  completedLessons: ["lesson-1", "lesson-2"]  // Array in single item
}
```

### DON'T: Create Separate Item Per Lesson Completion
```typescript
// ❌ BAD: One DynamoDB item per completed lesson
interface LessonCompletion {
  PK: "STUDENT#student-123",
  SK: "COMPLETION#lesson-1",  // Creates N items per course
  completed: true
}
```

## Forward-Looking Requirements (For Future Phases)

The following decisions in this phase will affect subsequent implementations:

### 1. Video File Naming Convention (→ Phase 2: Mini Course Content)
**Decision in Slice 1.2:** S3 object key format
- **Format:** `courses/{courseId}/lesson-{order}.mp4`
- **Example:** `courses/spec-driven-dev-mini/lesson-1.mp4`
- **Why:** Phase 2 will upload videos following this convention

### 2. Lesson Data Schema (→ Phase 2: Mini Course Content)
**Decision in Slice 1.1:** Required vs optional fields
- **Required:** `lessonId`, `title`, `videoKey`, `order`
- **Optional:** `description`, `duration`, `thumbnail`
- **Why:** Phase 2 will create lesson records via script

### 3. CloudFront Signed URL Expiration (→ Phase 2 & Production)
**Decision in Slice 1.2:** URL lifetime and key management
- **Expiration:** 30 minutes (env var: `VIDEO_URL_EXPIRY_MINUTES`)
- **Key storage:** CloudFront private key in AWS Secrets Manager
- **Why:** Balances security and UX

### 4. Course Completion Detection (→ Phase 3: Premium Upsell)
**Decision in Slice 1.3:** How to determine 100% completion
- **Threshold:** All lessons marked complete (100%)
- **Alternative considered:** 90% threshold
- **Why:** Phase 3 triggers premium upsell modal on completion

### 5. Video Watch Threshold (→ User Experience)
**Decision in Slice 1.4:** When to mark lesson complete
- **Threshold:** 90% watched (allows skipping credits/outro)
- **Debounce:** Max once per 30 seconds
- **Why:** Better UX, reduces unnecessary writes

## Deliverables

By the end of this mainspec:

1. **Type System**
   - `CourseVideo` → `Lesson` rename complete in backend and frontend
   - `CourseModule.videos` → `CourseModule.lessons`
   - All references updated

2. **Backend Infrastructure**
   - DynamoDB Lesson entity (at least 1 test lesson)
   - DynamoDB Progress entity
   - S3 bucket (private) + CloudFront distribution with OAI
   - API endpoints for lessons and progress

3. **Frontend Components**
   - Video player component (CloudFront integration)
   - Course page with real lesson data (no mock data)
   - Progress indicators (checkmarks, percentage, resume button)

4. **Documentation**
   - Video upload guide (S3 manual upload process)
   - CloudFront setup guide (OAI, signed URLs)
   - API documentation

5. **Testing**
   - Unit tests for progress calculation
   - Integration tests for video URL generation
   - E2E test: Enroll → View lessons → Play video → Mark complete

## Slices Breakdown

1. **Slice 1.1: Type System Refactor & Data Model** - Rename `CourseVideo` → `Lesson`, define Progress schema, DynamoDB structure
2. **Slice 1.2: Video Infrastructure (AWS)** - S3 bucket, CloudFront distribution, signed URL generation service
3. **Slice 1.3: Progress Tracking API** - Backend endpoints for saving/retrieving progress
4. **Slice 1.4: Video Player Component** - Frontend player with CloudFront integration and watch tracking
5. **Slice 1.5: Course Lesson UI** - Replace mock data with real lesson fetching and display

Each slice will have detailed specifications in `specs/course_content_system/slices/`.
