# Slice 1.1: Type System Refactor & Data Model

**Parent Mainspec:** `specs/course_content_system/mainspec.md`
**Status:** Not Started
**Depends On:** None (first slice)

## Objective
Refactor the type system to use semantic domain naming (`CourseVideo` → `Lesson`) and define the DynamoDB data model for lessons and progress tracking. This slice focuses on type definitions and schema design - no implementation of APIs or UI components yet.

## What We're Doing

### 1. Type System Refactor
**Files to modify:**
- `backend/src/features/courses/course.types.ts`
- `frontend/app/actions/courses.ts`

**Changes:**
```typescript
// BEFORE (Today)
export interface CourseVideo {
  videoId: string;
  title: string;
  lengthInMins: number;
  videoPath: string;
}

export interface CourseModule {
  moduleId: string;
  moduleName: string;
  videos: CourseVideo[];
}

// AFTER (Tomorrow)
export interface Lesson {
  lessonId: string;        // Renamed from videoId
  title: string;
  lengthInMins: number;
  videoKey: string;        // Renamed from videoPath - stores S3 object key
}

export interface CourseModule {
  moduleId: string;
  moduleName: string;
  lessons: Lesson[];       // Renamed from videos
}
```

### 2. DynamoDB Lesson Entity Schema
**New file:** `backend/src/features/lessons/lesson.types.ts`

Define the Lesson entity for DynamoDB storage:

```typescript
export interface LessonEntity {
  PK: string;              // "COURSE#<courseId>"
  SK: string;              // "LESSON#<lessonId>"
  GSI1PK?: string;         // "LESSON#<lessonId>" (for direct lesson lookup)
  GSI1SK?: string;         // "COURSE#<courseId>" (for reverse index)

  // Lesson data
  lessonId: string;        // "lesson-1"
  courseId: string;        // "spec-driven-dev-mini"
  title: string;           // "Introduction to Spec-Driven Development"
  description?: string;    // Optional detailed description
  videoKey: string;        // S3 key: "courses/spec-driven-dev-mini/lesson-1.mp4"
  lengthInMins?: number;   // Optional: 15 (can be derived from video metadata)
  thumbnailKey?: string;   // Optional: S3 key for thumbnail image
  order: number;           // Display order: 1, 2, 3, 4, 5

  // Timestamps
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

**Access Patterns:**
- Get all lessons for a course: Query `PK = COURSE#<courseId>` AND `SK begins_with LESSON#`
- Get specific lesson: Query `GSI1PK = LESSON#<lessonId>` (or use PK/SK if courseId known)

### 3. DynamoDB Progress Entity Schema
**New file:** `backend/src/features/progress/progress.types.ts`

Define the Progress entity for tracking student completion:

```typescript
export interface ProgressEntity {
  PK: string;              // "STUDENT#<studentId>"
  SK: string;              // "PROGRESS#<courseId>"

  // Progress data
  studentId: string;       // "student-123"
  courseId: string;        // "spec-driven-dev-mini"
  completedLessons: string[]; // ["lesson-1", "lesson-2", "lesson-3"]
  lastAccessedLesson?: string; // "lesson-3" (for "Resume" functionality)
  percentage: number;      // 60 (calculated: completedLessons.length / totalLessons * 100)

  // Timestamps
  updatedAt: string;       // ISO timestamp (last progress update)
}
```

**Access Pattern:**
- Get student's progress for a course: Query `PK = STUDENT#<studentId>` AND `SK = PROGRESS#<courseId>`

### 4. API Response Types
**New file:** `backend/src/features/lessons/lesson.types.ts` (add to existing)

Define clean API response types (what frontend receives):

```typescript
// Frontend-facing Lesson type (extends from course.types.ts Lesson)
export interface LessonResponse extends Lesson {
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  lengthInMins?: number;
  thumbnailUrl?: string;   // Signed CloudFront URL (not S3 key)
  order: number;
  isCompleted?: boolean;   // Populated when fetching with student context
}

// Progress API response
export interface ProgressResponse {
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;
  totalLessons: number;    // For frontend to calculate progress bar
  updatedAt: string;
}
```

## What We're NOT Doing
- No API endpoint implementation (that's Slice 1.3)
- No video URL signing logic (that's Slice 1.2)
- No video player component (that's Slice 1.4)
- No UI changes (that's Slice 1.5)
- No database writes - just type definitions

## Acceptance Criteria

### Type System Changes
- [ ] `CourseVideo` renamed to `Lesson` in both backend and frontend
- [ ] `videoId` → `lessonId` rename complete
- [ ] `videoPath` → `videoKey` rename complete
- [ ] `CourseModule.videos` → `CourseModule.lessons` rename complete
- [ ] All TypeScript compilation errors resolved
- [ ] Existing tests updated to use new type names

### Schema Definitions
- [ ] `LessonEntity` interface created with PK/SK structure
- [ ] `ProgressEntity` interface created with PK/SK structure
- [ ] GSI access patterns documented
- [ ] API response types defined (`LessonResponse`, `ProgressResponse`)

### Documentation
- [ ] DynamoDB access patterns documented (query examples)
- [ ] Field descriptions clear (what goes in `videoKey`, etc.)

### Testing
- [ ] TypeScript compiles without errors: `pnpm run build` in backend
- [ ] TypeScript compiles without errors: `pnpm run build` in frontend
- [ ] Existing unit tests pass (may need type updates, no logic changes)

## Implementation Notes

### Rename Strategy
1. **Backend first**: Update `backend/src/features/courses/course.types.ts`
2. **Frontend second**: Update `frontend/app/actions/courses.ts` (keep in sync)
3. **Search and replace**: Use global find/replace for `CourseVideo` → `Lesson`
4. **Test compilation**: Run `pnpm run build` after each file change

### DynamoDB Single-Table Design Pattern
Following existing pattern in codebase:
- **Main Table**: Already exists (referenced in SAM template)
- **PK/SK Pattern**: `ENTITY#<id>` format (consistent with Student, Course entities)
- **GSI Pattern**: Existing GSI (check `template.yaml` for GSI name)

### videoKey Format (Decision for Slice 1.2)
The `videoKey` field will store S3 object keys in format:
```
courses/{courseId}/lesson-{order}.mp4
```
Example: `courses/spec-driven-dev-mini/lesson-1.mp4`

**Why:** Predictable naming for manual uploads (Phase 2) and easy key construction.

## Forward-Looking Requirements

### For Slice 1.2 (Video Infrastructure)
- `videoKey` format established: `courses/{courseId}/lesson-{order}.mp4`
- Thumbnail format (if used): `courses/{courseId}/thumbnails/lesson-{order}.jpg`

### For Slice 1.3 (Progress API)
- Progress percentage calculation: `(completedLessons.length / totalLessons) * 100`
- `totalLessons` must be provided or calculated from Lesson count query

### For Phase 2 (Mini Course Content)
- Lesson creation will require: `lessonId`, `courseId`, `title`, `videoKey`, `order`
- Optional fields can be added later: `description`, `lengthInMins`, `thumbnailKey`

## Do / Don't Examples

### DO: Use Semantic Field Names
```typescript
// ✅ GOOD: Clear what the field contains
interface Lesson {
  videoKey: string;  // "courses/spec-driven-dev-mini/lesson-1.mp4"
}
```

### DON'T: Use Ambiguous Field Names
```typescript
// ❌ BAD: Ambiguous - is this a path, URL, or key?
interface Lesson {
  videoPath: string;  // S3 key? HTTP URL? File system path?
}
```

### DO: Keep DynamoDB Keys Separate from Domain Types
```typescript
// ✅ GOOD: DynamoDB entity vs domain type
interface LessonEntity {
  PK: string;
  SK: string;
  lessonId: string;
  // ... other fields
}

interface Lesson {
  lessonId: string;  // No PK/SK - frontend doesn't need to know
  // ... other fields
}
```

### DON'T: Mix DynamoDB Keys with Domain Types
```typescript
// ❌ BAD: Exposing DynamoDB implementation to frontend
interface Lesson {
  PK: string;        // Frontend shouldn't know about DynamoDB keys
  SK: string;
  lessonId: string;
}
```

## Validation

After completing this slice:
```bash
# Backend
cd backend
pnpm run build        # Should compile with no errors
pnpm test             # Should pass (with type updates)
pnpm run typecheck    # Should pass

# Frontend
cd frontend
pnpm run build        # Should compile with no errors
pnpm run typecheck    # Should pass
```

## Deviations from Plan
_(To be filled during implementation)_

None expected - this is a pure refactoring slice with no behavioral changes.
