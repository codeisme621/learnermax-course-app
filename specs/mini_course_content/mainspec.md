# Feature - Mini Course Content: Spec-Driven Development

## Background
Phase 1 built the course content system with video infrastructure, progress tracking, and lesson UI. Now we need to populate it with the actual free mini course: "Spec-Driven Development with Context Engineering". This mini course will be 3-5 lessons teaching students how to build better software with AI collaboration through effective spec writing.

This mini course serves as:
1. **Lead magnet** - Free valuable content to attract students
2. **Product demo** - Shows the course platform works well
3. **Upsell funnel** - Sets up promotion for premium course (Phase 3)

## User Story
As a developer interested in AI-assisted coding, I want to learn the fundamentals of spec-driven development so I can work more effectively with AI coding agents. I expect a free mini course that teaches me practical skills in 3-5 short lessons (30-60 minutes total). Each lesson should have a clear learning objective, professional video content, and build on the previous lesson. At the end, I should understand the basics and be excited to learn more in a premium course.

## What We're Building
1. **Course Record Creation** - Create "Spec-Driven Dev Mini Course" in DynamoDB
2. **Lesson Data Creation** - Create 3-5 lesson records with titles, descriptions, order
3. **Video Upload & Integration** - Upload lesson videos to S3, link to lesson records
4. **Content Validation** - Verify all lessons play correctly, progress tracking works

## What We're NOT Building
- No video recording/production (videos assumed to exist)
- No video transcoding (use pre-encoded MP4s)
- No subtitles/captions
- No quiz or assessments
- No downloadable resources (PDFs, code samples)
- No premium course content (that's separate)

## Tech Details

### Course Content Structure
**Mini course:** "Spec-Driven Development with Context Engineering"
- **3-5 lessons** (based on earlier discussion)
- **Free course** (`pricingModel: 'free'`)
- **Sequential lesson order** (flat structure, no modules)
- **Total duration:** ~30-60 minutes

### Content Creation Flow
**Flow narrative:**
1. Create course record in DynamoDB → Returns `courseId: "spec-driven-dev-mini"`
2. Create 3-5 lesson records → Each with `lessonId`, `title`, `description`, `order`
3. Upload videos to S3 → Save to `s3://learnermax-videos/courses/spec-driven-dev-mini/lesson-{order}.mp4`
4. Update lesson records with `videoKey` pointing to S3 objects
5. Test: Enroll test student → Watch each lesson → Verify progress tracking
6. Verify CloudFront signed URLs work for all videos

### Domain Language
- **Mini Course**: Free introductory course (3-5 lessons)
- **Lesson**: Individual video lecture within the course
- **Video Key**: S3 object key for lesson video (`courses/{courseId}/lesson-{order}.mp4`)
- **Course Record**: DynamoDB item representing the course
- **Lesson Record**: DynamoDB item representing a single lesson

## Data Requirements

### Course Record
From Phase 1 established schema:
```typescript
{
  courseId: "spec-driven-dev-mini",
  name: "Spec-Driven Development with Context Engineering",
  description: "Learn how to build better software with AI collaboration by mastering spec writing and context engineering techniques.",
  instructor: "Your Name",  // To be provided
  pricingModel: "free",
  imageUrl: "https://...",  // Course thumbnail
  learningObjectives: [
    "Understand the fundamentals of spec-driven development",
    "Write clear, actionable specs that AI agents understand",
    "Apply context engineering principles to improve AI outputs",
    "Structure specifications for complex features",
    // ... more objectives
  ],
  curriculum: []  // Empty for flat lesson structure (no modules)
}
```

### Lesson Records (3-5 lessons)
From Phase 1 established schema:
```typescript
// Lesson 1
{
  PK: "COURSE#spec-driven-dev-mini",
  SK: "LESSON#lesson-1",
  lessonId: "lesson-1",
  courseId: "spec-driven-dev-mini",
  title: "Introduction to Spec-Driven Development",
  description: "Discover why specs matter when working with AI coding agents and how they improve software quality.",
  videoKey: "courses/spec-driven-dev-mini/lesson-1.mp4",
  lengthInMins: 12,  // From video metadata
  order: 1,
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z"
}

// Lesson 2, 3, 4, 5... (to be defined in slices)
```

### Video Files
**Format specifications:**
- **Container:** MP4
- **Video codec:** H.264
- **Audio codec:** AAC
- **Resolution:** 1080p (1920x1080) or 720p (1280x720)
- **Frame rate:** 24-30 fps
- **Bitrate:** 5-8 Mbps for 1080p, 2-5 Mbps for 720p
- **Naming:** `lesson-{order}.mp4` (e.g., `lesson-1.mp4`, `lesson-2.mp4`)

### S3 Storage Structure
```
s3://learnermax-videos/
└── courses/
    └── spec-driven-dev-mini/
        ├── lesson-1.mp4
        ├── lesson-2.mp4
        ├── lesson-3.mp4
        ├── lesson-4.mp4  (optional)
        └── lesson-5.mp4  (optional)
```

## Forward-Looking Requirements

### For Phase 3 (Premium Course Teaser)
**Course metadata needed:**
- Course completion should trigger premium upsell (already built in Phase 1)
- Course description should hint at premium content: "Learn the fundamentals... Want to dive deeper? Check out our premium course."

### For Phase 4 (Enrollment Email)
**Course details for email:**
- Course name and description for welcome email
- First lesson title and URL
- Expected completion time

### For Phase 5 (Landing Page)
**Marketing content:**
- Course value proposition (what students will learn)
- Learning objectives (bullet points)
- Course duration and lesson count
- Instructor bio (to be provided)

## Content Outline (To Be Detailed in Slices)

Based on earlier discussion (3-5 lessons on "Spec-Driven Dev with Context Engineering"):

**Suggested lesson structure:**
1. **Introduction to Spec-Driven Development** (~10-15 min)
   - Why specs matter with AI coding
   - Problems specs solve
   - Overview of the methodology

2. **Writing Your First Spec** (~12-15 min)
   - Spec structure and components
   - User stories vs technical specs
   - Practical example walkthrough

3. **Context Engineering Fundamentals** (~10-15 min)
   - What is context engineering
   - Reference authoritative code
   - Do/Don't examples pattern

4. **Advanced Spec Techniques** (~10-15 min) - Optional
   - Type signatures and contracts
   - Narrative specs with temporal flow
   - Forward-looking requirements

5. **Putting It All Together** (~8-12 min) - Optional
   - Complete spec example
   - Common pitfalls
   - Next steps (premium course teaser)

## Deliverables

By the end of this mainspec:

1. **Course Record**
   - DynamoDB Course item created
   - All metadata populated (name, description, learning objectives)
   - Available on dashboard for enrollment

2. **Lesson Records**
   - 3-5 DynamoDB Lesson items created
   - Ordered sequentially (1, 2, 3, ...)
   - Titles, descriptions, durations set

3. **Video Content**
   - All lesson videos uploaded to S3
   - Proper naming convention followed
   - CloudFront URLs working

4. **Integration Verification**
   - Test enrollment working
   - All videos play correctly
   - Progress tracking functional
   - Course completion detected (100%)

5. **Documentation**
   - Video upload guide (for future courses)
   - Course/lesson creation scripts
   - Content guidelines

## Slices Breakdown

1. **Slice 2.1: Course & Lesson Planning** - Define course details, lesson titles, learning objectives, content outline
2. **Slice 2.2: Course Data Creation** - Create course record in DynamoDB via script/API
3. **Slice 2.3: Lesson Data Creation** - Create 3-5 lesson records in DynamoDB
4. **Slice 2.4: Video Upload & Integration** - Upload videos to S3, link to lessons, verify playback

Each slice will have detailed specifications in `specs/mini_course_content/slices/`.
