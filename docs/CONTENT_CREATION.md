# Content Creation Guide

This guide explains how to create and publish course content in the LearnerMax platform.

## Overview

The LearnerMax platform uses:
- **DynamoDB** for course and lesson metadata
- **S3** for video storage
- **CloudFront** for secure video delivery with signed URLs
- **Scripts** for content population (no admin UI yet)

## Prerequisites

- AWS CLI installed and configured
- Access to `learnermax-education-preview` DynamoDB table
- Access to `learnermax-videos-preview` S3 bucket
- Video files in MP4 format (H.264 codec, AAC audio)

## Step-by-Step Process

### 1. Plan Your Course

Define the following in a planning document (see `specs/mini_course_content/slices/slice-2.1-course-and-lesson-planning.md` as an example):

- **Course ID**: Unique identifier (e.g., `spec-driven-dev-mini`)
- **Course Name**: Display name
- **Instructor**: Instructor name
- **Description**: Short and long descriptions
- **Learning Objectives**: 3-7 bullet points
- **Pricing Model**: `free` or `paid`
- **Lessons**: Title, description, estimated duration for each lesson

### 2. Prepare Video Files

**Format requirements:**
- Container: MP4
- Video codec: H.264
- Audio codec: AAC
- Resolution: 1080p (1920x1080) or 720p (1280x720)
- Frame rate: 24-30 fps
- Bitrate: 5-8 Mbps for 1080p, 2-5 Mbps for 720p

**Naming convention:**
- `lesson-1.mp4`, `lesson-2.mp4`, `lesson-3.mp4`, etc.

### 3. Create Course Record

**Option A: Use the seed script template**

1. Copy `backend/scripts/seed-mini-course.sh` as a template
2. Update the course metadata:
   ```bash
   local course_id="your-course-id"
   local name="Your Course Name"
   local description="Your course description"
   local instructor="Your Name"
   ```
3. Update learning objectives in the script
4. Make executable: `chmod +x scripts/seed-your-course.sh`
5. Run: `./scripts/seed-your-course.sh`

**Option B: Use AWS CLI directly**

```bash
aws dynamodb put-item \
  --table-name learnermax-education-preview \
  --region us-east-1 \
  --item '{
    "PK": {"S": "COURSE#your-course-id"},
    "SK": {"S": "METADATA"},
    "GSI1PK": {"S": "COURSE#your-course-id"},
    "GSI1SK": {"S": "METADATA"},
    "entityType": {"S": "COURSE"},
    "courseId": {"S": "your-course-id"},
    "name": {"S": "Your Course Name"},
    "description": {"S": "Your description"},
    "instructor": {"S": "Your Name"},
    "pricingModel": {"S": "free"},
    "imageUrl": {"S": "https://placeholder.com/image.jpg"},
    "learningObjectives": {"L": [
      {"S": "Objective 1"},
      {"S": "Objective 2"}
    ]},
    "curriculum": {"L": []},
    "createdAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"},
    "updatedAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"}
  }'
```

### 4. Create Lesson Records

**Option A: Use the seed script template**

1. Copy `backend/scripts/seed-mini-course-lessons.sh` as a template
2. Update the `create_lesson` calls with your lesson data:
   ```bash
   create_lesson \
       "lesson-1" \
       "1" \
       "Your Lesson Title" \
       "Your lesson description" \
       "15"  # Duration in minutes
   ```
3. Make executable: `chmod +x scripts/seed-your-course-lessons.sh`
4. Run: `./scripts/seed-your-course-lessons.sh`

**Important DynamoDB Keys:**
- `PK`: `COURSE#your-course-id`
- `SK`: `LESSON#lesson-{order}`
- `GSI1PK`: `LESSON#lesson-{order}`
- `GSI1SK`: `COURSE#your-course-id`
- `videoKey`: `courses/your-course-id/lesson-{order}.mp4`

### 5. Upload Videos to S3

**Option A: Use upload script**

1. Place your video file in `backend/sample-video.mp4.mp4`
2. Update `backend/scripts/upload-mini-course-videos.sh` with your course ID
3. Run: `./scripts/upload-mini-course-videos.sh`

**Option B: Upload directly with AWS CLI**

```bash
# Upload each lesson video
aws s3 cp lesson-1.mp4 \
  s3://learnermax-videos-preview/courses/your-course-id/lesson-1.mp4 \
  --region us-east-1

aws s3 cp lesson-2.mp4 \
  s3://learnermax-videos-preview/courses/your-course-id/lesson-2.mp4 \
  --region us-east-1
```

**Option C: Use AWS Console**

1. Navigate to S3 bucket: `learnermax-videos-preview`
2. Create folder: `courses/your-course-id/`
3. Upload videos: `lesson-1.mp4`, `lesson-2.mp4`, etc.

### 6. Verify Setup

Run the verification script:

```bash
cd backend
./scripts/verify-video-urls.sh
```

This checks:
- ✓ Course record exists in DynamoDB
- ✓ Lesson records exist in DynamoDB
- ✓ Videos uploaded to S3
- ✓ CloudFront distribution configured
- ✓ API endpoints accessible

### 7. Test Course

**Frontend testing:**

1. Deploy/access the frontend application
2. Sign in with a test account
3. Check if course appears on dashboard
4. Click "Enroll" (for free courses, enrollment is instant)
5. Navigate to course page
6. Click each lesson and verify videos play
7. Complete lessons and verify progress tracking updates
8. Verify course completion (100% progress)

**API testing (requires authentication):**

```bash
# Get course details
curl -H "Authorization: Bearer <token>" \
  https://w6s58tolz3.execute-api.us-east-1.amazonaws.com/Prod/api/courses/your-course-id

# Get lessons
curl -H "Authorization: Bearer <token>" \
  https://w6s58tolz3.execute-api.us-east-1.amazonaws.com/Prod/api/courses/your-course-id/lessons

# Get video URL (returns CloudFront signed URL)
curl -H "Authorization: Bearer <token>" \
  https://w6s58tolz3.execute-api.us-east-1.amazonaws.com/Prod/api/lessons/lesson-1/video-url
```

## Course Structure Best Practices

### Learning Objectives

- Use action verbs (Understand, Apply, Create, Analyze, Evaluate)
- Be specific and measurable
- Focus on outcomes, not content
- Keep to 3-7 objectives per course

**Examples:**
- ✅ "Apply context engineering principles when writing specifications"
- ❌ "Learn about context engineering"

### Lesson Descriptions

- Keep to 1-2 sentences
- Explain what the student will learn (outcome focus)
- Build on previous lessons
- Use engaging, active language

**Example:**
```
Discover the difference between vibe coding and spec-driven development,
and why serious developers are adopting specs to build better software
with AI collaboration.
```

### Video Guidelines

- **Duration**: Keep lessons under 20 minutes for better engagement
- **Intro**: 30-60 second lesson intro explaining what they'll learn
- **Structure**: Problem → Solution → Example → Summary
- **Outro**: Briefly preview next lesson (builds anticipation)

### Course Progression

- **Lesson 1**: Foundation/problem space
- **Middle lessons**: Core concepts and techniques
- **Final lesson**: Integration + next steps/upsell

## Troubleshooting

### Course doesn't appear on dashboard

**Check:**
1. Course record exists in DynamoDB:
   ```bash
   aws dynamodb get-item \
     --table-name learnermax-education-preview \
     --key '{"PK":{"S":"COURSE#your-course-id"},"SK":{"S":"METADATA"}}'
   ```
2. Frontend is deployed and using correct API endpoint
3. API endpoint is accessible

### Videos don't play

**Check:**
1. Videos uploaded to correct S3 path:
   ```bash
   aws s3 ls s3://learnermax-videos-preview/courses/your-course-id/
   ```
2. videoKey in lesson records matches S3 object key exactly
3. CloudFront signed URL generation working:
   ```bash
   ./scripts/verify-video-urls.sh
   ```
4. CloudFront distribution has correct origin (S3 bucket)
5. CloudFront signing keys configured in Secrets Manager

### Progress tracking not working

**Check:**
1. User is enrolled in course:
   ```bash
   aws dynamodb get-item \
     --table-name learnermax-education-preview \
     --key '{"PK":{"S":"STUDENT#<userId>"},"SK":{"S":"ENROLLMENT#your-course-id"}}'
   ```
2. Progress API endpoint working
3. Frontend calling progress update API correctly

## Data Schema Reference

### Course Record

```typescript
{
  PK: "COURSE#<courseId>",
  SK: "METADATA",
  GSI1PK: "COURSE#<courseId>",
  GSI1SK: "METADATA",
  entityType: "COURSE",
  courseId: string,
  name: string,
  description: string,
  instructor: string,
  pricingModel: "free" | "paid",
  price?: number,  // only if pricingModel is "paid"
  imageUrl: string,
  learningObjectives: string[],
  curriculum: [],  // empty for flat lesson structure
  createdAt: string,  // ISO 8601
  updatedAt: string   // ISO 8601
}
```

### Lesson Record

```typescript
{
  PK: "COURSE#<courseId>",
  SK: "LESSON#<lessonId>",
  GSI1PK: "LESSON#<lessonId>",
  GSI1SK: "COURSE#<courseId>",
  entityType: "LESSON",
  lessonId: string,        // "lesson-1", "lesson-2", etc.
  courseId: string,
  title: string,
  description?: string,
  videoKey: string,        // "courses/<courseId>/lesson-<order>.mp4"
  lengthInMins?: number,
  order: number,           // 1, 2, 3, etc.
  createdAt: string,
  updatedAt: string
}
```

## Future Enhancements

Planned features for easier content creation:

- [ ] Admin UI for course/lesson creation
- [ ] Direct video upload through UI
- [ ] Automatic video duration extraction
- [ ] Bulk lesson import from CSV
- [ ] Course templates
- [ ] Video transcoding pipeline
- [ ] Subtitle/caption support

## Example: Mini Course Creation

See the complete example in:
- Spec: `specs/mini_course_content/mainspec.md`
- Scripts: `backend/scripts/seed-mini-course*.sh`
- Planning: `specs/mini_course_content/slices/slice-2.1-course-and-lesson-planning.md`

This shows the full workflow for the "Spec-Driven Development with Context Engineering" mini course.
