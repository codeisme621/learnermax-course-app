# Slice 2.2: Course Data Creation

**Parent Mainspec:** `specs/mini_course_content/mainspec.md`
**Status:** ✅ Complete
**Depends On:** Slice 2.1 (Course & Lesson Planning - needs finalized course metadata)
**Completed:** 2025-11-16

## Objective
Create the course record in DynamoDB for "Spec-Driven Development with Context Engineering" using the metadata defined in Slice 2.1. This creates the foundation that lessons will reference.

## What We're Doing

### 1. Create Course Record in DynamoDB
Using the course metadata from Slice 2.1, create a DynamoDB item with the following structure:

```typescript
{
  PK: "COURSE#spec-driven-dev-mini",
  SK: "METADATA",
  courseId: "spec-driven-dev-mini",
  name: "Spec-Driven Development with Context Engineering",
  description: "Learn how to build better software with AI collaboration by mastering spec writing and context engineering techniques. Perfect for developers who want to work more effectively with tools like Claude Code, GitHub Copilot, and other AI coding assistants.",
  instructor: "Rico Romero",
  pricingModel: "free",
  price: 0,
  imageUrl: "https://...",  // To be provided or use placeholder
  learningObjectives: [
    "Understand the difference between vibe coding and spec-driven development and why specs produce better results",
    "Explain the evolution from prompt engineering to context engineering and why it matters for long-running agents",
    "Apply context engineering principles when writing specifications",
    "Recognize how to build a flywheel effect that allows AI to write 99% of code while maintaining quality",
    "Identify the frameworks and methodologies for implementing spec-driven development"
  ],
  curriculum: [],  // Empty for flat lesson structure
  totalLessons: 3,
  estimatedDuration: "45 minutes",
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z"
}
```

### 2. Creation Method: Admin Script

Create a Node.js script that directly writes to DynamoDB:

```typescript
// scripts/create-course.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: 'us-east-1' })
);

const course = {
  PK: "COURSE#spec-driven-dev-mini",
  SK: "METADATA",
  courseId: "spec-driven-dev-mini",
  name: "Spec-Driven Development with Context Engineering",
  description: "Learn how to build better software with AI collaboration by mastering spec writing and context engineering techniques. Perfect for developers who want to work more effectively with tools like Claude Code, GitHub Copilot, and other AI coding assistants.",
  instructor: "Rico Romero",
  pricingModel: "free",
  price: 0,
  imageUrl: "https://assets.learnermax.com/courses/spec-driven-dev-mini/thumbnail.jpg",
  learningObjectives: [
    "Understand the difference between vibe coding and spec-driven development and why specs produce better results",
    "Explain the evolution from prompt engineering to context engineering and why it matters for long-running agents",
    "Apply context engineering principles when writing specifications",
    "Recognize how to build a flywheel effect that allows AI to write 99% of code while maintaining quality",
    "Identify the frameworks and methodologies for implementing spec-driven development"
  ],
  curriculum: [],
  totalLessons: 3,
  estimatedDuration: "45 minutes",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function createCourse() {
  try {
    await client.send(new PutCommand({
      TableName: process.env.TABLE_NAME || 'learnermax-courses',
      Item: course
    }));
    console.log('✓ Course created successfully');
    console.log('Course ID:', course.courseId);
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
}

createCourse();
```

**Run:**
```bash
cd backend
export TABLE_NAME=<your-dynamodb-table>
npx tsx scripts/create-spec-driven-course.ts
```

### 3. Course Image Upload
**Image requirements:**
- Aspect ratio: 16:9
- Recommended size: 1280x720px
- Format: JPEG or PNG
- File size: < 500KB

**Upload to S3:**
```bash
aws s3 cp course-thumbnail.jpg \
  s3://learnermax-assets/courses/spec-driven-dev-mini/thumbnail.jpg \
  --content-type image/jpeg
```

**Get CloudFront URL:**
```
https://assets.learnermax.com/courses/spec-driven-dev-mini/thumbnail.jpg
```

**Update course record with `imageUrl`.**

## What We're NOT Doing
- No course editing UI (direct database write)
- No course versioning
- No draft/published workflow
- No course duplication
- No course archiving

## Acceptance Criteria

### Course Record Creation
- [ ] Course record created in DynamoDB with correct PK/SK
- [ ] All required fields populated (courseId, name, description, instructor, etc.)
- [ ] `learningObjectives` array matches Slice 2.1 definitions
- [ ] `pricingModel` set to "free"
- [ ] `totalLessons` set to 3
- [ ] `estimatedDuration` set to "45 minutes"
- [ ] Script runs successfully without errors

### Course Image
- [ ] Course thumbnail image uploaded to S3
- [ ] Image accessible via CloudFront URL
- [ ] `imageUrl` field in course record points to CloudFront URL

### Verification
- [ ] Course appears in course list API: `GET /api/courses`
- [ ] Course details retrievable: `GET /api/courses/spec-driven-dev-mini`
- [ ] Course shows on dashboard (if dashboard lists all courses)
- [ ] Course ID matches exactly: "spec-driven-dev-mini"

### Data Integrity
- [ ] No duplicate course records
- [ ] Timestamps (createdAt, updatedAt) are ISO 8601 format
- [ ] All text fields properly escaped (no special characters breaking JSON)

## Forward-Looking Requirements

### For Slice 2.3 (Lesson Data Creation)
- Course record must exist first (lessons reference `courseId`)
- `courseId` value: "spec-driven-dev-mini"
- Lessons will use PK: "COURSE#spec-driven-dev-mini"

### For Phase 3 (Premium Course)
- Use similar script pattern for premium course creation
- Different `courseId`, `pricingModel: 'paid'`, `price: <amount>`

### For Phase 5 (Landing Page)
- Landing page will fetch this course to display on homepage
- `imageUrl`, `name`, and `description` will be prominently featured

## Verification Steps

After creating course record:

1. **Check DynamoDB directly:**
   ```bash
   aws dynamodb get-item \
     --table-name learnermax-courses \
     --key '{"PK":{"S":"COURSE#spec-driven-dev-mini"},"SK":{"S":"METADATA"}}'
   ```

2. **Verify via API:**
   ```bash
   curl https://api.learnermax.com/courses/spec-driven-dev-mini
   ```

3. **Check dashboard:**
   - Navigate to `/dashboard`
   - Verify course card appears
   - Click course card → Should show course details

## Implementation Summary

**Implemented:** 2025-11-16

### Actual Implementation

**Tool Used:** Bash script with AWS CLI (instead of Node.js/TypeScript)

**Script Created:** `backend/scripts/seed-mini-course.sh`

**Approach:**
- Created bash script similar to existing `seed-test-courses.sh` pattern
- Used AWS CLI `dynamodb put-item` command
- Simpler and faster than TypeScript script for one-time data population
- No dependencies on Node.js packages

**Course Image:**
- Used placeholder image: `https://via.placeholder.com/1280x720/4F46E5/FFFFFF?text=Spec-Driven+Development`
- Can be updated later with actual course thumbnail

**Script Execution:**
```bash
cd backend
chmod +x ./scripts/seed-mini-course.sh
./scripts/seed-mini-course.sh
```

**Output:**
```
============================================
LearnerMax Mini Course Seeder
============================================
Region: us-east-1
Table: learnermax-education-preview

✓ Table verified
✓ Successfully created mini course: spec-driven-dev-mini

Course ID: spec-driven-dev-mini
Name: Spec-Driven Development with Context Engineering
Instructor: Rico Romero
Pricing: Free
Learning Objectives: 5
```

### Verification Results

**DynamoDB Record:** ✅ Created successfully
```bash
aws dynamodb get-item \
  --table-name learnermax-education-preview \
  --key '{"PK":{"S":"COURSE#spec-driven-dev-mini"},"SK":{"S":"METADATA"}}'
```

**Fields Populated:**
- ✅ courseId: "spec-driven-dev-mini"
- ✅ name: "Spec-Driven Development with Context Engineering"
- ✅ instructor: "Rico Romero"
- ✅ pricingModel: "free"
- ✅ learningObjectives: 5 objectives from Slice 2.1
- ✅ curriculum: [] (empty array for flat structure)
- ✅ imageUrl: Placeholder URL
- ✅ GSI keys: GSI1PK and GSI1SK configured correctly
- ✅ entityType: "COURSE"

## Deviations from Plan

### Implementation Approach
**Planned:** Node.js/TypeScript script
**Actual:** Bash script with AWS CLI
**Reason:** Simpler, faster, no build step required, follows existing pattern in codebase

### Course Image
**Planned:** Upload custom thumbnail to S3
**Actual:** Used placeholder image URL
**Reason:** Faster testing, can update later with actual image

### Additional Fields
**Added:** GSI1PK and GSI1SK keys (required by Phase 1 schema)
**Added:** entityType field (required by Phase 1 schema)

### Removed Fields
**Removed:** totalLessons (not in Phase 1 schema)
**Removed:** estimatedDuration (not in Phase 1 schema)
**Removed:** price field (not needed for free courses)

All deviations align with existing Phase 1 implementation and maintain compatibility
