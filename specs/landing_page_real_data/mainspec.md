# Feature - Landing Page Real Data Integration

## Background
Phases 1-4 built the platform foundation, mini course content, premium course teaser, and enrollment email system. The landing page currently displays mock data (`mockCourse` from `lib/mock-data/course.ts`) featuring a fictional "Master Modern Web Development" course by "Sarah Johnson" with fake stats and testimonials.

For MVP launch, the landing page must showcase the actual free mini course: "Spec-Driven Development with Context Engineering". This makes the landing page authentic, aligns with the actual product offering, and provides a cohesive experience from landing → enrollment → learning.

## User Story
As a visitor landing on the LearnerMax homepage, I want to see information about the actual free course that's available - "Spec-Driven Development with Context Engineering" - not generic mock content. I expect to see:
- The real course title, description, and learning objectives
- Accurate course details (3-5 lessons, ~30-60 minutes duration)
- Authentic instructor information (Rico Romero)
- A clear call-to-action to enroll in this specific course

When I click "Enroll Now", I should be directed to the enrollment flow for this exact course, and after enrolling, I should see the same course on my dashboard.

## What We're Building
1. **Static Site Generation (SSG)** - Convert landing page to use Next.js SSG with build-time data fetching
2. **Data Transformation Layer** - Transform backend Course type to landing page CourseData interface
3. **Component Data Mapping** - Update landing page components to handle real course data structure
4. **Static Content Addition** - Add instructor bio, testimonials, and stats to course data
5. **Metadata Updates** - Update page metadata (title, description) to reflect actual course
6. **Remove Mock Data** - Delete mock data file and references

## What We're NOT Building
- No course listing/catalog page (single course landing page only)
- No course search or filtering
- No multiple course comparison
- No course reviews/ratings system (testimonials remain static for MVP)
- No dynamic testimonials from database (use curated static testimonials)
- No A/B testing or personalization
- No landing page analytics tracking beyond basic page views
- No SEO optimization beyond basic metadata

## Tech Details

### Architecture Flow
**Current State (Today):**
```typescript
// frontend/app/page.tsx (Client Component)
import { mockCourse } from '@/lib/mock-data/course';

export default function HomePage() {
  return (
    <main>
      <HeroSection course={mockCourse} />
      <CourseMetadataSection course={mockCourse} />
      <TestimonialsSection course={mockCourse} />
    </main>
  );
}
```

**Future State (After This Mainspec):**
```typescript
// frontend/app/page.tsx (Server Component with SSG)
import { getCourseForLanding } from '@/lib/api/courses';

// Static Site Generation: Fetch data at build time
export const revalidate = false; // Never revalidate (true static)

export default async function HomePage() {
  // Fetched once at build time, baked into HTML
  const course = await getCourseForLanding('spec-driven-dev-mini');

  return (
    <main>
      <HeroSection course={course} />
      <CourseMetadataSection course={course} />
      <TestimonialsSection course={course} />
    </main>
  );
}
```

**Data flow (Build Time):**
```
Next.js Build Process
  ↓
HomePage Server Component
  ↓
getCourseForLanding('spec-driven-dev-mini')
  ↓
fetch(`${API_BASE_URL}/api/courses/spec-driven-dev-mini`)
  ↓
Backend: courseService.getCourse(courseId)
  ↓
DynamoDB: Fetch course record
  ↓
Transform Course → CourseData
  ↓
Generate static HTML with data
  ↓
Deploy: User receives pre-rendered HTML (no runtime API calls)
```

**Key SSG Benefits:**
- Fast page load (pre-rendered HTML)
- No runtime API calls for landing page
- SEO-friendly (search engines see full content)
- Reduced API load (data fetched once at build, not per user)

### Domain Language
- **Static Site Generation (SSG)**: Pre-rendering pages at build time
- **Build-time Fetching**: Data fetched during `next build`, not at runtime
- **Landing Page Course Data**: Public course data transformed for marketing display
- **Course API**: Existing `/api/courses/:courseId` endpoint
- **CourseData**: Landing page interface (different from backend Course type)
- **Static Testimonials**: Curated testimonials stored in code (not from database)
- **Data Transformation Layer**: Maps backend Course → frontend CourseData

## Data Requirements

### Backend Course Type (Existing)
From `backend/src/features/courses/course.types.ts`:

```typescript
interface Course {
  courseId: string;              // "spec-driven-dev-mini"
  name: string;                  // "Spec-Driven Development..."
  description: string;           // Full description
  instructor: string;            // "Rico Romero"
  pricingModel: 'free' | 'paid';
  price?: number;
  stripeProductId?: string;
  stripePriceId?: string;
  imageUrl: string;
  learningObjectives: string[];  // ["Understand...", "Write..."]
  curriculum: CourseModule[];
}

interface CourseModule {
  moduleId: string;
  moduleName: string;
  videos: CourseVideo[];         // Note: Will be renamed to "lessons" in Phase 1
}

interface CourseVideo {
  videoId: string;
  title: string;
  lengthInMins: number;
  videoPath: string;
}
```

### Frontend CourseData Interface (Landing Page)
From `frontend/lib/mock-data/course.ts`:

```typescript
interface CourseData {
  id: string;                    // courseId
  title: string;                 // name
  subtitle: string;              // derived from description
  description: string;           // description
  duration: string;              // calculated: "3 lessons (~45 minutes)"
  level: string;                 // static: "Beginner"
  category: string;              // static: "Software Development"
  instructor: {
    name: string;                // instructor
    title: string;               // static: "Software Engineer & Educator"
    background: string;          // static bio paragraph
    imageUrl: string;            // static or optional
  };
  outcomes: string[];            // learningObjectives
  curriculum: {
    module: string;              // "Course Content"
    topics: string[];            // video titles from curriculum
  }[];
  testimonials: {                // static testimonials
    id: string;
    name: string;
    role: string;
    content: string;
    imageUrl: string;
    rating: number;
  }[];
  stats: {
    students: string;            // "100+" (static or calculated)
    rating: string;              // "4.9/5" (static)
    certificates: string;        // "80+" (static)
  };
}
```

### Data Transformation Logic

**Transformation function:**
```typescript
// frontend/lib/api/courses.ts
import type { Course } from '@/types/course';
import type { CourseData } from '@/lib/mock-data/course';

export async function getCourseForLanding(courseId: string): Promise<CourseData> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // Fetch course from backend
  const response = await fetch(`${API_BASE_URL}/api/courses/${courseId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch course: ${response.status}`);
  }

  const course: Course = await response.json();

  // Calculate duration from curriculum
  const totalVideos = course.curriculum.reduce((sum, module) =>
    sum + module.videos.length, 0
  );
  const totalMinutes = course.curriculum.reduce((sum, module) =>
    sum + module.videos.reduce((modSum, video) => modSum + video.lengthInMins, 0), 0
  );
  const duration = `${totalVideos} lessons (~${totalMinutes} minutes)`;

  // Extract topics from curriculum
  const topics = course.curriculum.flatMap(module =>
    module.videos.map(video => video.title)
  );

  // Transform to CourseData
  return {
    id: course.courseId,
    title: course.name,
    subtitle: extractSubtitle(course.description),
    description: course.description,
    duration,
    level: "Beginner",  // Static for mini course
    category: "Software Development",
    instructor: {
      name: course.instructor,
      title: "Software Engineer & Educator",
      background: getInstructorBio(),  // Static function
      imageUrl: "/images/instructor-rico.jpg"
    },
    outcomes: course.learningObjectives,
    curriculum: [
      {
        module: "Course Content",
        topics
      }
    ],
    testimonials: getStaticTestimonials(),
    stats: {
      students: "100+",  // Static for MVP
      rating: "4.9/5",
      certificates: "80+"
    }
  };
}

function extractSubtitle(description: string): string {
  // Extract first sentence or first 100 chars
  const firstSentence = description.split('.')[0];
  return firstSentence.length > 100
    ? firstSentence.substring(0, 100) + '...'
    : firstSentence;
}

function getInstructorBio(): string {
  return "Experienced software engineer passionate about teaching developers how to work effectively with AI coding tools. Specializes in spec-driven development and context engineering.";
}

function getStaticTestimonials() {
  return [
    {
      id: "testimonial-1",
      name: "Michael Chen",
      role: "Software Developer",
      content: "This course completely changed how I work with AI coding tools. The spec-driven approach makes everything clearer.",
      imageUrl: "/images/testimonial-1.jpg",
      rating: 5
    },
    // ... more testimonials
  ];
}
```

### Next.js SSG Configuration

**Landing page with SSG:**
```typescript
// frontend/app/page.tsx
import { getCourseForLanding } from '@/lib/api/courses';
import type { Metadata } from 'next';

// Force static generation (no revalidation)
export const revalidate = false;

// Or explicitly use generateStaticParams for dynamic routes
// For static route (homepage), Next.js SSG is automatic

export async function generateMetadata(): Promise<Metadata> {
  const course = await getCourseForLanding('spec-driven-dev-mini');

  return {
    title: `${course.title} - LearnerMax`,
    description: course.description,
    openGraph: {
      title: course.title,
      description: course.subtitle,
      images: [course.instructor.imageUrl]
    }
  };
}

export default async function HomePage() {
  // This runs at build time, not at runtime
  const course = await getCourseForLanding('spec-driven-dev-mini');

  return (
    <>
      <Header />
      <main className="min-h-screen pt-16">
        <HeroSection course={course} />
        <TrustIndicators />
        <BenefitsSection />
        <CourseMetadataSection course={course} />
        <TestimonialsSection course={course} />
        <CtaSection />
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
```

**Build command:**
```bash
# Frontend build
cd frontend
pnpm run build  # Fetches course data and generates static HTML

# Output: .next/ contains pre-rendered HTML with course data baked in
```

## Forward-Looking Requirements

### For Future Multi-Course Landing Pages
**Dynamic route with SSG:**
```typescript
// app/courses/[courseId]/page.tsx
export async function generateStaticParams() {
  // Generate static pages for all courses at build time
  const courses = await fetch(`${API_URL}/api/courses`).then(r => r.json());
  return courses.map(c => ({ courseId: c.courseId }));
}

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const course = await getCourseForLanding(params.courseId);
  // Same layout, different data
}
```

### For Incremental Static Regeneration (ISR)
**If course data changes frequently:**
```typescript
// Revalidate every 24 hours
export const revalidate = 86400;

export default async function HomePage() {
  // Regenerates page after 24 hours when visited
  const course = await getCourseForLanding('spec-driven-dev-mini');
  // ...
}
```

### For Dynamic Stats
**When stats need to be real-time:**
```typescript
// Option 1: Client-side fetch (hydration)
'use client';
export function CourseStats({ courseId }: { courseId: string }) {
  const { data } = useSWR(`/api/courses/${courseId}/stats`);
  // Fetched on client after page load
}

// Option 2: Server Component with ISR
export const revalidate = 3600; // 1 hour
```

### For User-Generated Testimonials
**When testimonials come from database:**
```typescript
// Add to backend
router.get('/:courseId/testimonials', async (req, res) => {
  const testimonials = await getTopTestimonials(req.params.courseId);
  res.json(testimonials);
});

// Frontend fetches at build time
const testimonials = await fetch(`${API_URL}/api/courses/${courseId}/testimonials`);
```

## Slices Breakdown

1. **Slice 5.1: Data Fetching and SSG Landing Page** - Create data transformation layer, convert page.tsx to use SSG with real data, and remove mock data (includes verifying components work and cleanup)
2. **Slice 5.2: Static Content Curation** - Define instructor bio, testimonials, stats, and placeholder image generation

Each slice will have detailed specifications in `specs/landing_page_real_data/slices/`.
