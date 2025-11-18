# Slice 5.1: Data Fetching, SSG Landing Page, and Mock Data Cleanup

**Parent Mainspec:** `specs/landing_page_real_data/mainspec.md`
**Status:** Not Started
**Depends On:** None (uses existing backend API and environment variables)

## Objective
Create the data transformation layer that fetches course data from the backend API, convert the landing page to use this real data with Next.js Static Site Generation (SSG), and remove all mock data infrastructure. The page will be pre-rendered at build time with actual course information, requiring no runtime API calls. Leave the codebase clean with no mock data remnants.

## What We're Doing

### 1. Move CourseData Interface to Types

**Create:** `frontend/types/landing.ts`

Move the `CourseData` interface from mock-data to a proper types file:

```typescript
/**
 * Landing page course data structure
 * Transformed from backend Course type with static content
 */
export interface CourseData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  level: string;
  category: string;
  instructor: {
    name: string;
    title: string;
    background: string;
    imageUrl: string;
  };
  outcomes: string[];
  curriculum: {
    module: string;
    topics: string[];
  }[];
  testimonials: {
    id: string;
    name: string;
    role: string;
    content: string;
    imageUrl: string;
    rating: number;
  }[];
  stats: {
    students: string;
    rating: string;
    certificates: string;
  };
}
```

### 2. Create Frontend Course Type

**Create:** `frontend/types/course.ts`

Mirror the backend Course type for type safety:

```typescript
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

export interface Course {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  pricingModel: 'free' | 'paid';
  price?: number;
  stripeProductId?: string;
  stripePriceId?: string;
  imageUrl: string;
  learningObjectives: string[];
  curriculum: CourseModule[];
}
```

### 3. Create Environment Validation Helper

**Create:** `frontend/lib/env.ts`

Helper to validate environment variables at build time:

```typescript
/**
 * Get API base URL with validation
 * Throws error if NEXT_PUBLIC_API_URL is not set
 */
export function getApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    console.error('❌ NEXT_PUBLIC_API_URL is not set');
    console.error('Set it in .env.local (already exists in the project)');
    throw new Error('Missing required environment variable: NEXT_PUBLIC_API_URL');
  }

  return apiUrl;
}
```

**Note:** We already have `NEXT_PUBLIC_API_URL` configured in `.env.local` (line 19). No need to create new environment files.

### 4. Create Course API Client with Transformation

**Create:** `frontend/lib/api/courses.ts`

Functions to fetch and transform course data:

```typescript
import type { Course } from '@/types/course';
import type { CourseData } from '@/types/landing';
import {
  getInstructorProfile,
  getStaticTestimonials,
  getCourseStats
} from '@/lib/static-content';
import { getApiBaseUrl } from '@/lib/env';

/**
 * Fetch course from backend API
 * Used at build time for SSG
 */
export async function fetchCourse(courseId: string): Promise<Course> {
  const API_BASE_URL = getApiBaseUrl();
  const url = `${API_BASE_URL}/api/courses/${courseId}`;

  console.log('[fetchCourse] Fetching course from:', url);

  const response = await fetch(url, {
    // No caching during build - always fetch fresh data
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch course: ${response.status} ${response.statusText}`);
  }

  const course: Course = await response.json();
  console.log('[fetchCourse] Successfully fetched course:', course.courseId);

  return course;
}

/**
 * Transform backend Course to landing page CourseData
 * Includes static content like instructor bio and testimonials
 */
export async function getCourseForLanding(courseId: string): Promise<CourseData> {
  // Fetch course from backend
  const course = await fetchCourse(courseId);

  // Calculate duration from curriculum
  const totalLessons = course.curriculum.reduce(
    (sum, module) => sum + module.videos.length,
    0
  );
  const totalMinutes = course.curriculum.reduce(
    (sum, module) => sum + module.videos.reduce(
      (modSum, video) => modSum + video.lengthInMins,
      0
    ),
    0
  );
  const duration = `${totalLessons} lesson${totalLessons > 1 ? 's' : ''} (~${totalMinutes} minutes)`;

  // Extract lesson titles from curriculum
  const topics = course.curriculum.flatMap(module =>
    module.videos.map(video => video.title)
  );

  // Get static content
  const instructorProfile = getInstructorProfile();
  const testimonials = getStaticTestimonials();
  const stats = getCourseStats();

  // Transform to landing page format
  return {
    id: course.courseId,
    title: course.name,
    subtitle: extractSubtitle(course.description),
    description: course.description,
    duration,
    level: 'Beginner',
    category: 'Software Development',
    instructor: {
      name: course.instructor,
      title: instructorProfile.title,
      background: instructorProfile.background,
      imageUrl: instructorProfile.imageUrl
    },
    outcomes: course.learningObjectives,
    curriculum: [
      {
        module: 'Course Content',
        topics
      }
    ],
    testimonials,
    stats
  };
}

/**
 * Extract subtitle from description
 * Uses first sentence or truncates at 100 chars
 */
function extractSubtitle(description: string): string {
  const firstSentence = description.split('.')[0];
  if (firstSentence.length > 100) {
    return firstSentence.substring(0, 100) + '...';
  }
  return firstSentence;
}
```

### 5. Convert Landing Page to Server Component with SSG

**Update:** `frontend/app/page.tsx`

Transform from client component with mock data to server component with SSG:

```typescript
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { TrustIndicators } from '@/components/landing/TrustIndicators';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { CourseMetadataSection } from '@/components/landing/CourseMetadataSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import { getCourseForLanding } from '@/lib/api/courses';

// Static metadata (fallback if generateMetadata fails)
export const metadata: Metadata = {
  title: 'Spec-Driven Development with Context Engineering - LearnerMax',
  description: 'Learn how to build better software with AI collaboration. Free mini course on spec-driven development.',
};

// Force static generation (no revalidation)
// This tells Next.js to generate the page once at build time
export const revalidate = false;

// Dynamic metadata generation based on course data
export async function generateMetadata(): Promise<Metadata> {
  try {
    const course = await getCourseForLanding('spec-driven-dev-mini');

    return {
      title: `${course.title} - LearnerMax`,
      description: course.description,
      openGraph: {
        title: course.title,
        description: course.subtitle,
        type: 'website',
        locale: 'en_US',
        siteName: 'LearnerMax',
      },
      twitter: {
        card: 'summary_large_image',
        title: course.title,
        description: course.subtitle,
      },
    };
  } catch (error) {
    console.error('[generateMetadata] Failed to fetch course data:', error);
    // Return fallback metadata
    return metadata;
  }
}

// Main page component - runs at build time
export default async function HomePage() {
  console.log('[HomePage] Fetching course data for SSG at build time...');

  try {
    // This fetch happens once during build, not on each request
    const course = await getCourseForLanding('spec-driven-dev-mini');

    console.log('[HomePage] Successfully fetched course data:', {
      courseId: course.id,
      title: course.title,
      lessonCount: course.curriculum[0]?.topics.length || 0
    });

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
  } catch (error) {
    console.error('[HomePage] Failed to fetch course data:', error);

    // Show error page during development
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Failed to Load Course Data
            </h1>
            <p className="text-gray-700 mb-4">
              Could not fetch course data from backend API.
            </p>
            <pre className="text-left bg-gray-100 p-4 rounded text-sm overflow-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
            <p className="text-sm text-gray-600 mt-4">
              Backend API: {process.env.NEXT_PUBLIC_API_URL}
            </p>
          </div>
        </div>
      );
    }

    // In production, build should fail if data cannot be fetched
    throw error;
  }
}
```

### 6. Update Package Scripts

**Update:** `frontend/package.json`

Add helpful build scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:check": "pnpm run generate:placeholders && pnpm run build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "generate:placeholders": "./scripts/generate-placeholder-images.sh",
    "preview": "pnpm run build && pnpm run start"
  }
}
```

### 7. Delete Mock Data File

**Delete:** `frontend/lib/mock-data/course.ts`

After confirming all imports are updated:

```bash
cd frontend
rm lib/mock-data/course.ts

# If the directory is now empty, remove it
rmdir lib/mock-data 2>/dev/null || true
```

**Verification before deletion:**
```bash
# Ensure no files import from mock-data/course
grep -r "from '@/lib/mock-data/course'" --include="*.ts" --include="*.tsx" .

# Should return NO results
```

## What We're NOT Doing
- No new backend endpoints (use existing `/api/courses/:courseId`)
- No new environment variable files (use existing `.env.local`)
- No standalone test scripts (build is the test)
- No Incremental Static Regeneration (ISR) - purely static
- No client-side data fetching on the landing page
- No loading states (data is pre-rendered)
- No runtime API calls from landing page
- No dynamic routes (single static homepage only)
- No fallback pages for build failures

## Acceptance Criteria

### Type Definitions
- [ ] `frontend/types/course.ts` created
- [ ] Types mirror backend Course interface
- [ ] No TypeScript errors

### Environment Helper
- [ ] `frontend/lib/env.ts` created
- [ ] `getApiBaseUrl()` validates environment variable
- [ ] Uses existing `NEXT_PUBLIC_API_URL` from `.env.local`

### API Client and Transformation
- [ ] `frontend/lib/api/courses.ts` created
- [ ] `fetchCourse()` function fetches from `/api/courses/:courseId`
- [ ] `getCourseForLanding()` transforms Course → CourseData
- [ ] Calculates duration from curriculum
- [ ] Extracts lesson titles to topics array
- [ ] Maps all required fields
- [ ] Uses environment helper for API URL
- [ ] Console logs added for build-time debugging

### Page Conversion
- [ ] `app/page.tsx` converted to async Server Component
- [ ] Removed import of `mockCourse`
- [ ] Added import of `getCourseForLanding`
- [ ] `revalidate = false` set for static generation
- [ ] `generateMetadata` function implemented
- [ ] Error handling for build-time failures
- [ ] Development error page shows helpful debugging info
- [ ] All components receive `course` prop with real data

### Field Mapping
- [ ] `id` ← `courseId`
- [ ] `title` ← `name`
- [ ] `subtitle` ← extracted from `description`
- [ ] `description` ← `description`
- [ ] `duration` ← calculated from curriculum
- [ ] `outcomes` ← `learningObjectives`
- [ ] `instructor.name` ← `instructor`
- [ ] `curriculum[0].topics` ← flattened video titles
- [ ] `testimonials` ← from static content (Slice 5.2)
- [ ] `stats` ← from static content (Slice 5.2)

### Build Verification
- [ ] Build completes successfully
- [ ] Console shows "[HomePage] Fetching course data for SSG at build time..."
- [ ] Console shows course data fetched successfully
- [ ] Static HTML generated in `.next/`
- [ ] No runtime API calls on landing page
- [ ] Metadata reflects actual course info

### Mock Data Cleanup
- [ ] `CourseData` interface moved to `types/landing.ts`
- [ ] `lib/api/courses.ts` imports from `@/types/landing`
- [ ] All components import `CourseData` from `@/types/landing`
- [ ] `lib/mock-data/course.ts` deleted
- [ ] `lib/mock-data/` directory removed (if empty)
- [ ] No imports from `@/lib/mock-data/course` in codebase
- [ ] Search for "mockCourse" returns no results (excluding git history)

## Testing Strategy

### Test: Complete Build Flow

**Step 1: Start backend**
```bash
cd backend
pnpm run dev  # Port 8080

# Verify API is accessible
curl http://localhost:8080/api/courses/spec-driven-dev-mini
```

Expected response: Course JSON with `spec-driven-dev-mini` data

**Step 2: Verify environment variable**
```bash
cd frontend
cat .env.local | grep NEXT_PUBLIC_API_URL
```

Expected: `NEXT_PUBLIC_API_URL="https://w6s58tolz3.execute-api.us-east-1.amazonaws.com/Prod"` or `http://localhost:8080`

**Note:** For local testing, temporarily change `.env.local` to point to localhost:
```bash
NEXT_PUBLIC_API_URL="http://localhost:8080"
```

**Step 3: Generate placeholder images**
```bash
cd frontend
pnpm run generate:placeholders
```

Expected: Images created in `public/images/`

**Step 4: Build frontend**
```bash
cd frontend
pnpm run build
```

Expected output:
```
[HomePage] Fetching course data for SSG at build time...
[fetchCourse] Fetching course from: http://localhost:8080/api/courses/spec-driven-dev-mini
[fetchCourse] Successfully fetched course: spec-driven-dev-mini
[HomePage] Successfully fetched course data: { courseId: 'spec-driven-dev-mini', ... }

Route (app)                  Size     First Load JS
┌ ○ /                        5.2 kB         120 kB
└ ○ /...                     ...            ...

✓ Compiled successfully
```

**Step 5: Preview built site**
```bash
cd frontend
pnpm run start  # Port 3000
```

Open `http://localhost:3000` and verify:
- [ ] Page loads instantly (no loading spinner)
- [ ] Course title is "Spec-Driven Development with Context Engineering" (NOT "Master Modern Web Development")
- [ ] Instructor name is "Rico Romero" (NOT "Sarah Johnson")
- [ ] Learning objectives are real course objectives
- [ ] Lesson topics are displayed (from curriculum)
- [ ] Testimonials appear (from static content)
- [ ] Stats show "100+", "4.9/5", "80+"
- [ ] Images load (instructor and testimonials)
- [ ] "Enroll Now" button works

**Step 6: Verify no runtime API calls**

Open DevTools → Network tab, refresh page:
- [ ] No API calls to backend (no `/api/courses/` requests)
- [ ] HTML is fully rendered on first load
- [ ] Only static assets load (CSS, JS, images)

**Step 7: View page source**

Right-click → View Page Source:
- [ ] HTML contains "Spec-Driven Development with Context Engineering" in text
- [ ] HTML contains learning objectives text
- [ ] HTML contains testimonial text
- [ ] NO "Master Modern Web Development" (old mock data)
- [ ] NO "Sarah Johnson" (old mock instructor)

**Step 8: Verify mock data cleanup**

```bash
cd frontend

# Should return NO results:
grep -r "mockCourse" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".next"

# Should return NO results:
grep -r "from '@/lib/mock-data/course'" --include="*.ts" --include="*.tsx" .

# Verify file is deleted:
ls lib/mock-data/course.ts 2>&1 | grep "No such file"

# Verify types import correctly:
grep -r "from '@/types/landing'" --include="*.ts" --include="*.tsx" .
```

Expected:
- No references to `mockCourse`
- No imports from `@/lib/mock-data/course`
- Mock data file deleted
- Components import from `@/types/landing`

### Test: Build Failure Without Backend

```bash
cd frontend
# Temporarily set invalid URL in .env.local
NEXT_PUBLIC_API_URL="http://localhost:9999" pnpm run build
```

Expected result:
- [ ] Build FAILS with clear error message
- [ ] Error shows "Failed to fetch course" or connection error
- [ ] Error message shows URL attempted

### Test: Missing Environment Variable

```bash
cd frontend
# Temporarily remove or comment out NEXT_PUBLIC_API_URL in .env.local
pnpm run build
```

Expected result:
- [ ] Build FAILS immediately
- [ ] Error: "Missing required environment variable: NEXT_PUBLIC_API_URL"

## Forward-Looking Requirements

### For Incremental Static Regeneration (ISR)

**If course data changes frequently:**

```typescript
// app/page.tsx
export const revalidate = 86400; // 24 hours

// Page will be regenerated at most once per day
```

### For Multiple Course Landing Pages

**Dynamic routes with SSG:**

```typescript
// app/courses/[courseId]/page.tsx
export async function generateStaticParams() {
  const courses = await fetch(`${API_URL}/api/courses`).then(r => r.json());
  return courses.map(c => ({ courseId: c.courseId }));
}

export default async function CoursePage({ params }: { params: { courseId: string } }) {
  const course = await getCourseForLanding(params.courseId);
  // Same layout, different data
}
```

### For Error Handling with Fallbacks

**If build should succeed even if API is down:**

```typescript
export async function getCourseForLanding(courseId: string): Promise<CourseData> {
  try {
    const course = await fetchCourse(courseId);
    return transformCourse(course);
  } catch (error) {
    console.warn('[getCourseForLanding] API fetch failed, using fallback data');
    return getFallbackCourseData();  // Static fallback
  }
}
```

### For Build Caching During Development

**To avoid hitting API on every hot reload:**

```typescript
// Only in development
const cache = new Map<string, Course>();

export async function fetchCourse(courseId: string): Promise<Course> {
  if (process.env.NODE_ENV === 'development' && cache.has(courseId)) {
    return cache.get(courseId)!;
  }

  const course = await fetch(...);
  cache.set(courseId, course);
  return course;
}
```

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May add retry logic if API is unreliable during builds
- May add fallback data if build should succeed without backend
- May add build-time data caching for faster builds
- May need CORS configuration on backend for build-time fetches
- May add ISR if course data updates frequently
- May adjust error handling based on CI/CD requirements
