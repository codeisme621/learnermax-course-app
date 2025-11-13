# Slice 3.1: Premium Course Placeholder

**Parent Mainspec:** `specs/premium_course_teaser/mainspec.md`
**Status:** Not Started
**Depends On:** Phase 2 Slice 2.2 (Course Data Creation pattern established)

## Objective
Create a placeholder course record in DynamoDB for the premium course "Advanced Spec-Driven Development Mastery" with `comingSoon: true` flag. This course will appear on the dashboard but cannot be enrolled in yet.

## What We're Doing

### 1. Create Premium Course Record

Using the same admin script pattern from Phase 2 Slice 2.2, create a course record with "coming soon" status:

```typescript
{
  PK: "COURSE#premium-spec-course",
  SK: "METADATA",
  courseId: "premium-spec-course",
  name: "Advanced Spec-Driven Development Mastery",
  description: "Master advanced spec-driven development techniques with real-world case studies, hands-on projects, and in-depth coverage of context engineering patterns. Build a comprehensive portfolio of specs that showcase your expertise.",
  instructor: "Rico Romero",
  pricingModel: "paid",
  price: 199,  // Placeholder price (not used in MVP)
  stripeProductId: null,
  stripePriceId: null,
  imageUrl: "https://assets.learnermax.com/courses/premium-spec-course/thumbnail.jpg",
  learningObjectives: [
    "Design complex multi-feature specifications for large codebases",
    "Implement advanced context engineering patterns and best practices",
    "Build spec-driven development workflows for development teams",
    "Create reusable spec templates and pattern libraries",
    "Optimize AI agent performance through iterative spec refinement",
    "Conduct spec reviews and provide constructive feedback"
  ],
  comingSoon: true,              // NEW: Indicates unreleased course
  totalLessons: null,            // Not defined yet
  estimatedDuration: "6-8 hours",
  curriculum: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
```

### 2. Admin Script

**Create:** `scripts/create-premium-course.ts`

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: 'us-east-1' })
);

const premiumCourse = {
  PK: "COURSE#premium-spec-course",
  SK: "METADATA",
  courseId: "premium-spec-course",
  name: "Advanced Spec-Driven Development Mastery",
  description: "Master advanced spec-driven development techniques with real-world case studies, hands-on projects, and in-depth coverage of context engineering patterns. Build a comprehensive portfolio of specs that showcase your expertise.",
  instructor: "Rico Romero",
  pricingModel: "paid",
  price: 199,
  stripeProductId: null,
  stripePriceId: null,
  imageUrl: "https://assets.learnermax.com/courses/premium-spec-course/thumbnail.jpg",
  learningObjectives: [
    "Design complex multi-feature specifications for large codebases",
    "Implement advanced context engineering patterns and best practices",
    "Build spec-driven development workflows for development teams",
    "Create reusable spec templates and pattern libraries",
    "Optimize AI agent performance through iterative spec refinement",
    "Conduct spec reviews and provide constructive feedback"
  ],
  comingSoon: true,
  totalLessons: null,
  estimatedDuration: "6-8 hours",
  curriculum: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

async function createPremiumCourse() {
  try {
    await client.send(new PutCommand({
      TableName: process.env.TABLE_NAME || 'learnermax-courses',
      Item: premiumCourse
    }));
    console.log('✓ Premium course placeholder created successfully');
    console.log('Course ID:', premiumCourse.courseId);
  } catch (error) {
    console.error('Error creating premium course:', error);
    throw error;
  }
}

createPremiumCourse();
```

**Run:**
```bash
cd backend
export TABLE_NAME=<your-dynamodb-table>
npx tsx scripts/create-premium-course.ts
```

### 3. Course Image

**Upload premium course thumbnail:**
```bash
aws s3 cp premium-course-thumbnail.jpg \
  s3://learnermax-assets/courses/premium-spec-course/thumbnail.jpg \
  --content-type image/jpeg
```

**Image specifications:**
- Aspect ratio: 16:9
- Size: 1280x720px
- Should visually distinguish from mini course (different color scheme or design)
- Communicate "premium" or "advanced" nature

## What We're NOT Doing
- No actual premium course content (lessons, videos)
- No enrollment functionality (can't enroll in coming soon courses)
- No payment integration (Stripe not used in MVP)
- No detailed curriculum planning (just placeholder)
- No specific launch date (keep it vague with "Coming Soon")

## Acceptance Criteria

### Course Record Creation
- [ ] Premium course record created in DynamoDB
- [ ] `courseId` is "premium-spec-course"
- [ ] `comingSoon` field set to `true`
- [ ] `pricingModel` is "paid"
- [ ] `price` set to placeholder value (199)
- [ ] `stripeProductId` and `stripePriceId` are null
- [ ] No `estimatedLaunchDate` field (keep launch timing vague)
- [ ] Script runs without errors

### Course Image
- [ ] Premium course thumbnail uploaded to S3
- [ ] Image accessible via CloudFront URL
- [ ] `imageUrl` field populated with correct URL
- [ ] Image visually distinct from mini course

### Verification
- [ ] Course appears in course list: `GET /api/courses`
- [ ] Course details retrievable: `GET /api/courses/premium-spec-course`
- [ ] `comingSoon: true` in API response
- [ ] Course shows on dashboard (verified in Slice 3.3)

### Data Integrity
- [ ] No duplicate course records
- [ ] Timestamps in ISO 8601 format
- [ ] All required fields populated

## Forward-Looking Requirements

### For Slice 3.2 (Early Access Backend)
- Early access API will reference this `courseId: "premium-spec-course"`

### For Slice 3.3 (Dashboard Premium Card)
- Dashboard will check `comingSoon` field to render "Coming Soon" badge
- Will not show "Enroll" button for coming soon courses
- Display "Join Early Access" CTA instead

### For Future Course Launch
**When ready to launch premium course:**
1. Update `comingSoon: false`
2. Create actual lessons (like Phase 2)
3. Upload videos
4. Add Stripe product/price IDs
5. Enable enrollment

## Verification Steps

After creating premium course:

1. **Check DynamoDB:**
   ```bash
   aws dynamodb get-item \
     --table-name learnermax-courses \
     --key '{"PK":{"S":"COURSE#premium-spec-course"},"SK":{"S":"METADATA"}}'
   ```

2. **Verify via API:**
   ```bash
   curl https://api.learnermax.com/courses/premium-spec-course
   ```

   Expected response:
   ```json
   {
     "courseId": "premium-spec-course",
     "name": "Advanced Spec-Driven Development Mastery",
     "comingSoon": true,
     "pricingModel": "paid",
     "price": 199,
     ...
   }
   ```

3. **Check course list:**
   ```bash
   curl https://api.learnermax.com/courses
   ```

   Should return both courses:
   - spec-driven-dev-mini (free, comingSoon: false)
   - premium-spec-course (paid, comingSoon: true)

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May adjust price placeholder
- May add more learning objectives
- May use different courseId format
