# Slice 2.3: Lesson Data Creation

**Parent Mainspec:** `specs/mini_course_content/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 2.1 (Course & Lesson Planning - needs lesson titles and descriptions)
- Slice 2.2 (Course Data Creation - course must exist first)

## Objective
Create 3 lesson records in DynamoDB for the mini course using the lesson metadata defined in Slice 2.1. Each lesson will reference the course and be ordered sequentially.

## What We're Doing

### 1. Create 3 Lesson Records in DynamoDB

Using lesson metadata from Slice 2.1, create DynamoDB items for each lesson:

**Lesson 1: Vibe Coding vs. Spec-Driven Development**
```typescript
{
  PK: "COURSE#spec-driven-dev-mini",
  SK: "LESSON#lesson-1",
  GSI1PK: "LESSON#lesson-1",
  GSI1SK: "COURSE#spec-driven-dev-mini",

  lessonId: "lesson-1",
  courseId: "spec-driven-dev-mini",
  title: "Vibe Coding vs. Spec-Driven Development",
  description: "Discover the difference between vibe coding and spec-driven development, and why serious developers are adopting specs to build better software with AI collaboration.",
  videoKey: "courses/spec-driven-dev-mini/lesson-1.mp4",
  lengthInMins: 15,
  order: 1,
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z"
}
```

**Lesson 2: Prompt Engineering vs. Context Engineering**
```typescript
{
  PK: "COURSE#spec-driven-dev-mini",
  SK: "LESSON#lesson-2",
  GSI1PK: "LESSON#lesson-2",
  GSI1SK: "COURSE#spec-driven-dev-mini",

  lessonId: "lesson-2",
  courseId: "spec-driven-dev-mini",
  title: "Prompt Engineering vs. Context Engineering",
  description: "Learn the critical difference between prompt engineering and context engineering, and why context engineering is essential for working with modern AI coding agents.",
  videoKey: "courses/spec-driven-dev-mini/lesson-2.mp4",
  lengthInMins: 15,
  order: 2,
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z"
}
```

**Lesson 3: Spec-Driven Development with Context Engineering**
```typescript
{
  PK: "COURSE#spec-driven-dev-mini",
  SK: "LESSON#lesson-3",
  GSI1PK: "LESSON#lesson-3",
  GSI1SK: "COURSE#spec-driven-dev-mini",

  lessonId: "lesson-3",
  courseId: "spec-driven-dev-mini",
  title: "Spec-Driven Development with Context Engineering",
  description: "Master the practical application of spec-driven development with context engineering to achieve the ultimate goal: having AI write 99% of your code while maintaining high quality.",
  videoKey: "courses/spec-driven-dev-mini/lesson-3.mp4",
  lengthInMins: 15,
  order: 3,
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z"
}
```

### 2. Creation Method: Admin Script

Create a Node.js script that writes all 3 lessons to DynamoDB:

```typescript
// scripts/create-lessons.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: 'us-east-1' })
);

const lessons = [
  {
    PK: "COURSE#spec-driven-dev-mini",
    SK: "LESSON#lesson-1",
    GSI1PK: "LESSON#lesson-1",
    GSI1SK: "COURSE#spec-driven-dev-mini",
    lessonId: "lesson-1",
    courseId: "spec-driven-dev-mini",
    title: "Vibe Coding vs. Spec-Driven Development",
    description: "Discover the difference between vibe coding and spec-driven development, and why serious developers are adopting specs to build better software with AI collaboration.",
    videoKey: "courses/spec-driven-dev-mini/lesson-1.mp4",
    lengthInMins: 15,
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    PK: "COURSE#spec-driven-dev-mini",
    SK: "LESSON#lesson-2",
    GSI1PK: "LESSON#lesson-2",
    GSI1SK: "COURSE#spec-driven-dev-mini",
    lessonId: "lesson-2",
    courseId: "spec-driven-dev-mini",
    title: "Prompt Engineering vs. Context Engineering",
    description: "Learn the critical difference between prompt engineering and context engineering, and why context engineering is essential for working with modern AI coding agents.",
    videoKey: "courses/spec-driven-dev-mini/lesson-2.mp4",
    lengthInMins: 15,
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    PK: "COURSE#spec-driven-dev-mini",
    SK: "LESSON#lesson-3",
    GSI1PK: "LESSON#lesson-3",
    GSI1SK: "COURSE#spec-driven-dev-mini",
    lessonId: "lesson-3",
    courseId: "spec-driven-dev-mini",
    title: "Spec-Driven Development with Context Engineering",
    description: "Master the practical application of spec-driven development with context engineering to achieve the ultimate goal: having AI write 99% of your code while maintaining high quality.",
    videoKey: "courses/spec-driven-dev-mini/lesson-3.mp4",
    lengthInMins: 15,
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

async function createLessons() {
  try {
    for (const lesson of lessons) {
      await client.send(new PutCommand({
        TableName: process.env.TABLE_NAME || 'learnermax-courses',
        Item: lesson
      }));
      console.log(`✓ Created ${lesson.title}`);
    }
    console.log('\n✓ All 3 lessons created successfully');
  } catch (error) {
    console.error('Error creating lessons:', error);
    throw error;
  }
}

createLessons();
```

**Run:**
```bash
cd backend
export TABLE_NAME=<your-dynamodb-table>
npx tsx scripts/create-lessons.ts
```

## What We're NOT Doing
- No lesson editing UI (direct database write)
- No lesson reordering feature
- No lesson preview/draft mode
- No lesson deletion
- No lesson duplication

## Acceptance Criteria

### Lesson Records Creation
- [ ] All 3 lesson records created in DynamoDB
- [ ] Each lesson has correct PK/SK pattern
- [ ] Each lesson has GSI1PK/GSI1SK for lookup by lessonId
- [ ] All lessons reference `courseId: "spec-driven-dev-mini"`
- [ ] Lessons ordered sequentially (order: 1, 2, 3)
- [ ] Script runs without errors

### Lesson Data
- [ ] Lesson titles match Slice 2.1 definitions exactly
- [ ] Lesson descriptions match Slice 2.1 definitions
- [ ] `lengthInMins` set to 15 for all lessons
- [ ] `videoKey` follows pattern: `courses/spec-driven-dev-mini/lesson-{order}.mp4`
- [ ] Timestamps in ISO 8601 format

### Verification
- [ ] All lessons appear in API: `GET /api/courses/spec-driven-dev-mini/lessons`
- [ ] Lessons returned in correct order (1, 2, 3)
- [ ] Each lesson retrievable: `GET /api/lessons/{lessonId}/video-url` (will fail until videos uploaded)
- [ ] Total lesson count: 3

### Data Integrity
- [ ] No duplicate lesson records
- [ ] All lessons have unique `lessonId` values
- [ ] All lessons have unique `order` values
- [ ] videoKey values match expected S3 paths

## Forward-Looking Requirements

### For Slice 2.4 (Video Upload & Integration)
**Video file naming must match `videoKey` values:**
- `lesson-1.mp4` → uploads to `courses/spec-driven-dev-mini/lesson-1.mp4`
- `lesson-2.mp4` → uploads to `courses/spec-driven-dev-mini/lesson-2.mp4`
- `lesson-3.mp4` → uploads to `courses/spec-driven-dev-mini/lesson-3.mp4`

**Actual video durations:**
If actual video durations differ from 15 minutes, update `lengthInMins` field after upload.

### For Phase 3 (Premium Course)
- Use similar script pattern for premium course lessons
- Premium course will have different `courseId` and lesson content

## Verification Steps

After creating lesson records:

1. **Check DynamoDB directly:**
   ```bash
   aws dynamodb query \
     --table-name learnermax-courses \
     --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
     --expression-attribute-values '{":pk":{"S":"COURSE#spec-driven-dev-mini"},":sk":{"S":"LESSON#"}}'
   ```

2. **Verify via API:**
   ```bash
   curl https://api.learnermax.com/courses/spec-driven-dev-mini/lessons
   ```

   Expected response:
   ```json
   {
     "lessons": [
       {
         "lessonId": "lesson-1",
         "title": "Vibe Coding vs. Spec-Driven Development",
         "order": 1,
         ...
       },
       {
         "lessonId": "lesson-2",
         "title": "Prompt Engineering vs. Context Engineering",
         "order": 2,
         ...
       },
       {
         "lessonId": "lesson-3",
         "title": "Spec-Driven Development with Context Engineering",
         "order": 3,
         ...
       }
     ],
     "totalLessons": 3
   }
   ```

3. **Check course page UI:**
   - Navigate to `/course/spec-driven-dev-mini`
   - Verify all 3 lessons appear in sidebar
   - Lessons should show in order (1, 2, 3)
   - Video player will show error (videos not uploaded yet - expected)

## Lesson Data Reference

**From Slice 2.1:**

| Order | Lesson ID | Title | Duration | Description |
|-------|-----------|-------|----------|-------------|
| 1 | lesson-1 | Vibe Coding vs. Spec-Driven Development | 15 min | Discover the difference between vibe coding and spec-driven development... |
| 2 | lesson-2 | Prompt Engineering vs. Context Engineering | 15 min | Learn the critical difference between prompt engineering and context engineering... |
| 3 | lesson-3 | Spec-Driven Development with Context Engineering | 15 min | Master the practical application of spec-driven development with context engineering... |

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May need to adjust `lengthInMins` after extracting actual video durations
- May add optional `thumbnailKey` field for lesson thumbnails
- May add `description` field with longer content (current description is for UI display)
