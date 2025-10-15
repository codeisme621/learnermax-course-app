# Single Course Free Enrollment (Frontend) Implementation Plan

## Overview

Implement the frontend flow for single course free enrollment, enabling users to click "Enroll" on the landing page, complete authentication (email or Google OAuth), and automatically enroll in their desired course upon reaching the dashboard. The dashboard will display all available courses with contextual actions based on enrollment status.

## Current State Analysis

**What Exists:**
- Landing page with 3 enrollment buttons (HeroSection, CtaSection, Header) using URL parameter pattern
- Complete authentication flow (NextAuth.js + AWS Cognito)
- Dashboard with placeholder "Your Courses" section
- Backend enrollment API fully functional at `/api/enrollments`
- Mock course data with id `course-001`

**What's Missing:**
- SessionStorage pattern to persist courseId through auth flow
- Enrollment server actions in frontend
- Course card component with multiple states
- Dashboard enrollment logic (auto-enroll + manual enroll)
- Course page placeholder
- Integration between frontend and backend enrollment API

**Key Constraints:**
- No browser storage pattern exists in codebase yet (this will establish it)
- Google OAuth redirect may affect sessionStorage persistence (critical test)
- Spec explicitly requires removing URL parameter approach
- Backend API is ready and tested - no backend changes needed

## Desired End State

After this plan is complete:

1. **User clicks "Enroll Now" on landing page** → courseId `TEST-COURSE-001` stored in sessionStorage
2. **User completes email signup flow** → redirects to `/verify-email` → verifies email → auto signs in → redirects to `/dashboard`
3. **Dashboard loads** → checks sessionStorage → auto-enrolls user → displays enrolled course card
4. **User clicks "Continue Course"** → navigates to `/course/TEST-COURSE-001` placeholder page
5. **Alternative: User already logged in** → clicks "Enroll Now" on not-enrolled course card in dashboard → enrolls immediately
6. **Verification**: All automated tests pass, manual flows work for both email and Google OAuth

### Key Discoveries:
- Current enrollment buttons: `frontend/components/landing/HeroSection.tsx:40`, `frontend/components/landing/CtaSection.tsx:29`, `frontend/components/layout/Header.tsx:24`
- Dashboard content: `frontend/components/dashboard/DashboardContent.tsx:82` (placeholder section)
- Auth token helper: `frontend/app/actions/auth.ts:57-74` (getAccessToken function)
- Backend enrollment API: `backend/src/features/enrollment/enrollment.routes.ts:12` (POST), `:35` (GET), `:52` (GET check)
- Mock course data: `frontend/lib/mock-data/course.ts:37` (id: "course-001")

## What We're NOT Doing

- Full course player with video playback
- Lesson navigation and content delivery
- Progress tracking updates (only display existing progress)
- Course completion certificates
- Payment processing (free courses only)
- Multiple pending enrollment queue (single courseId only)
- Retry mechanism for auto-enrollment failures
- Error UI for auto-enrollment (logged only)
- Building a full course catalog page

## Implementation Approach

**Strategy**: Incremental, testable phases that build upon each other:
1. First, establish sessionStorage pattern in landing page buttons
2. Create backend integration layer (server actions)
3. Build reusable CourseCard component with state management
4. Integrate everything in dashboard with auto-enroll logic
5. Finally, add minimal course page placeholder

**Reasoning**: This approach allows us to test each piece independently before integration, and follows the data flow from user action → storage → API → display.

---

## Phase 1.a: Update Landing Page Enrollment Buttons

### Overview
Remove URL parameter pattern from all enrollment buttons and implement sessionStorage pattern. Update mock course data to use `TEST-COURSE-001` as specified.

### Changes Required:

#### 1.1 Update Mock Course Data
**File**: `frontend/lib/mock-data/course.ts`
**Changes**: Change courseId from `course-001` to `TEST-COURSE-001`

```typescript
export const mockCourse: CourseData = {
  id: "TEST-COURSE-001", // Changed from "course-001"
  title: "Master Modern Web Development",
  // ... rest remains the same
};
```

#### 1.2 Update HeroSection Component
**File**: `frontend/components/landing/HeroSection.tsx`
**Changes**: Replace Link with onClick handler to set sessionStorage

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation'; // Add this import
import { ArrowRight, Users, Award, BookOpen, type LucideIcon } from 'lucide-react';
import type { CourseData } from '@/lib/mock-data/course';

interface HeroSectionProps {
  course: CourseData;
}

export function HeroSection({ course }: HeroSectionProps) {
  const router = useRouter(); // Add this

  const handleEnrollClick = () => {
    // Store courseId in sessionStorage
    sessionStorage.setItem('pendingEnrollmentCourseId', course.id);
    // Navigate to enroll page
    router.push('/enroll');
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <Badge variant="secondary" className="mb-4">
              {course.category}
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {course.title}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              {course.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Button size="lg" onClick={handleEnrollClick}>
                Enroll Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline">
                Watch Video
              </Button>
            </div>

            {/* Stats remain the same */}
            <div className="grid grid-cols-3 gap-6">
              <StatItem
                icon={Users}
                value={course.stats.students}
                label="Students"
              />
              <StatItem
                icon={Award}
                value={course.stats.rating}
                label="Rating"
              />
              <StatItem
                icon={BookOpen}
                value={course.stats.certificates}
                label="Certificates"
              />
            </div>
          </motion.div>

          {/* Right Column - Image remains the same */}
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square lg:aspect-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// StatItem remains the same
function StatItem({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="text-center lg:text-left">
      <Icon className="w-6 h-6 text-primary mb-2 mx-auto lg:mx-0" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
```

#### 1.3 Update CtaSection Component
**File**: `frontend/components/landing/CtaSection.tsx`
**Changes**: Replace Link with onClick handler, use TEST-COURSE-001

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation'; // Add this import
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  const router = useRouter(); // Add this

  const handleGetStartedClick = () => {
    // Store hardcoded courseId as per spec
    sessionStorage.setItem('pendingEnrollmentCourseId', 'TEST-COURSE-001');
    router.push('/enroll');
  };

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Are You Ready To Start Our Course Now?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of students who are already learning and growing their skills.
            Start your journey today with lifetime access to all course materials.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStartedClick}>
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline">
              Contact Us
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

#### 1.4 Update Header Component
**File**: `frontend/components/layout/Header.tsx`
**Changes**: Replace Link with onClick handler for Enroll button

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Add this import

export function Header() {
  const router = useRouter(); // Add this

  const handleEnrollClick = () => {
    // Store hardcoded courseId as per spec
    sessionStorage.setItem('pendingEnrollmentCourseId', 'TEST-COURSE-001');
    router.push('/enroll');
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold text-primary">LearnerMax</div>
        </Link>

        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/signin">Sign In</Link>
          </Button>
          <Button onClick={handleEnrollClick}>
            Enroll Now
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}
```

---

## Phase 1.b: Validation Tests

### Automated Tests
Run the following automated tests and ensure they pass:
```bash
cd frontend
pnpm run test
pnpm run lint
pnpm run typecheck
```

### Manual Tests
**STOP** and execute these manual tests:

1. **Test sessionStorage setting**:
   - Open browser with DevTools (Application tab)
   - Navigate to landing page `http://localhost:3000`
   - Click "Enroll Now" in HeroSection
   - Verify sessionStorage contains key `pendingEnrollmentCourseId` with value `TEST-COURSE-001`
   - Go back to landing page
   - Click "Get Started" in CtaSection
   - Verify sessionStorage still contains the courseId
   - Click "Enroll Now" in Header
   - Verify sessionStorage still contains the courseId

2. **Test navigation**:
   - Verify all three buttons navigate to `/enroll` page (not `/enroll?courseid=...`)

---

## Phase 1.c: Manual Review and Optional Preview Deployment

**STOP** and ask user:
- Review the code changes in Phase 1.a
- Should we commit these changes?
- Should we deploy to preview environment?

### Success Criteria:
- [ ] Development Completed?
- [ ] All Validation Tests passing?
- [ ] Stopped and manually reviewed with user asking to commit and/or deploy to preview?

---

## Phase 2.a: Create Enrollment Server Actions

### Overview
Create server actions to integrate with backend enrollment API. These actions will handle authentication token extraction and API communication.

### Changes Required:

#### 2.1 Create Enrollment Server Actions File
**File**: `frontend/app/actions/enrollments.ts` (new file)
**Changes**: Create complete server actions file

```typescript
'use server';

import { getAccessToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
}

/**
 * Enrollment record returned from backend API
 */
export interface Enrollment {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid';
  enrolledAt: string; // ISO date string
  paymentStatus: 'free' | 'pending' | 'completed' | 'failed';
  progress: number; // 0-100
  completed: boolean;
}

/**
 * Result type for enrollment operations
 */
export interface EnrollmentResult {
  success: boolean;
  enrollment?: Enrollment;
  status?: 'active' | 'pending';
  error?: string;
}

/**
 * Enroll the current user in a course
 *
 * @param courseId - The ID of the course to enroll in
 * @returns EnrollmentResult with enrollment data or error
 */
export async function enrollInCourse(courseId: string): Promise<EnrollmentResult> {
  try {
    const token = await getAccessToken();

    if (!token) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const response = await fetch(`${API_URL}/api/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Failed to enroll: ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      enrollment: data.enrollment,
      status: data.status,
    };
  } catch (error) {
    console.error('Enrollment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Get all enrollments for the current user
 *
 * @returns Array of enrollments or null if error
 */
export async function getUserEnrollments(): Promise<Enrollment[] | null> {
  try {
    const token = await getAccessToken();

    if (!token) {
      console.warn('getUserEnrollments: Not authenticated');
      return null;
    }

    const response = await fetch(`${API_URL}/api/enrollments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh enrollment data
    });

    if (!response.ok) {
      console.error('Failed to fetch enrollments:', response.statusText);
      return null;
    }

    const enrollments: Enrollment[] = await response.json();
    return enrollments;
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return null;
  }
}

/**
 * Check if the current user is enrolled in a specific course
 *
 * @param courseId - The ID of the course to check
 * @returns true if enrolled, false otherwise
 */
export async function checkEnrollment(courseId: string): Promise<boolean> {
  try {
    const token = await getAccessToken();

    if (!token) {
      return false;
    }

    const response = await fetch(`${API_URL}/api/enrollments/check/${courseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.enrolled === true;
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return false;
  }
}
```

---

## Phase 2.b: Validation Tests

### Automated Tests
Run the following automated tests:
```bash
cd frontend
pnpm run test
pnpm run lint
pnpm run typecheck
```

### Manual Tests
**STOP** and execute these manual tests:

1. **Test with backend running**:
   - Ensure backend is running on correct API_URL
   - Verify `NEXT_PUBLIC_API_URL` is set in `.env.local`
   - Check backend logs to confirm API is accessible

2. **Test API integration (optional - requires authentication)**:
   - Can use Postman/curl to test backend endpoints directly
   - Or wait for Phase 4 dashboard integration tests

---

## Phase 2.c: Manual Review and Optional Preview Deployment

**STOP** and ask user:
- Review the server actions implementation
- Should we commit these changes?
- Should we deploy to preview environment?

### Success Criteria:
- [ ] Development Completed?
- [ ] All Validation Tests passing?
- [ ] Stopped and manually reviewed with user asking to commit and/or deploy to preview?

---

## Phase 3.a: Create Course Card Component with Multiple States

### Overview
Create a reusable CourseCard component that handles both enrolled and not-enrolled states, with appropriate UI and actions for each state.

### Changes Required:

#### 3.1 Create CourseCard Component
**File**: `frontend/components/dashboard/CourseCard.tsx` (new file)
**Changes**: Create complete CourseCard component

```typescript
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock, Award, Loader2, AlertCircle } from 'lucide-react';
import type { Course } from '@/app/actions/courses';
import type { Enrollment } from '@/app/actions/enrollments';

interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment; // Present if user is enrolled
  onEnroll?: (courseId: string) => Promise<void>; // Callback for enrollment action
}

export function CourseCard({ course, enrollment, onEnroll }: CourseCardProps) {
  const router = useRouter();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEnrolled = !!enrollment;

  const handleEnrollClick = async () => {
    if (!onEnroll) return;

    setError(null);
    setIsEnrolling(true);

    try {
      await onEnroll(course.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleContinueCourse = () => {
    router.push(`/course/${course.id}`);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Course Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-accent/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-primary/40" />
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {isEnrolled ? (
            <Badge variant="default" className="bg-green-600">
              Enrolled
            </Badge>
          ) : (
            <Badge variant="secondary">
              {course.pricingModel === 'free' ? 'Free' : `$${course.price}`}
            </Badge>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 line-clamp-2">
          {course.title}
        </h3>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {course.description}
        </p>

        {/* Course Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{course.duration || 'Self-paced'}</span>
          </div>
          {course.level && (
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4" />
              <span>{course.level}</span>
            </div>
          )}
        </div>

        {/* Enrolled State */}
        {isEnrolled && enrollment && (
          <div className="space-y-3">
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{enrollment.progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${enrollment.progress}%` }}
                />
              </div>
            </div>

            {/* Enrollment Date */}
            <p className="text-xs text-muted-foreground">
              Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
            </p>

            {/* Continue Button */}
            <Button
              onClick={handleContinueCourse}
              className="w-full"
              size="lg"
            >
              Continue Course
            </Button>
          </div>
        )}

        {/* Not Enrolled State */}
        {!isEnrolled && (
          <div className="space-y-3">
            {/* Instructor */}
            {course.instructor && (
              <p className="text-sm text-muted-foreground">
                By {course.instructor}
              </p>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            {/* Enroll Button */}
            <Button
              onClick={handleEnrollClick}
              disabled={isEnrolling || !onEnroll}
              className="w-full"
              size="lg"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enrolling...
                </>
              ) : (
                'Enroll Now'
              )}
            </Button>

            {/* Retry Button (if error) */}
            {error && (
              <Button
                onClick={handleEnrollClick}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isEnrolling}
              >
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
```

---

## Phase 3.b: Validation Tests

### Automated Tests
Run the following automated tests:
```bash
cd frontend
pnpm run test
pnpm run lint
pnpm run typecheck
```

### Manual Tests
**STOP** and execute these manual tests:

1. **Test component rendering with mock data**:
   - Create a test page or story to render CourseCard
   - Test with enrolled state (provide enrollment prop)
   - Test with not-enrolled state (no enrollment prop)
   - Verify badges, progress bar, and buttons render correctly

2. **Test button interactions**:
   - Click "Enroll Now" button (should trigger onEnroll callback)
   - Click "Continue Course" button (should navigate to course page)
   - Verify loading states during async operations

3. **Test responsive design**:
   - View card on mobile, tablet, and desktop sizes
   - Verify text truncation works (line-clamp)
   - Verify card layout is consistent

4. **Test error handling**:
   - Trigger enrollment error (mock failed onEnroll)
   - Verify error message displays
   - Verify "Try Again" button appears

---

## Phase 3.c: Manual Review and Optional Preview Deployment

**STOP** and ask user:
- Review the CourseCard component implementation
- Should we commit these changes?
- Should we deploy to preview environment?

### Success Criteria:
- [ ] Development Completed?
- [ ] All Validation Tests passing?
- [ ] Stopped and manually reviewed with user asking to commit and/or deploy to preview?

---

## Phase 4.a: Update Dashboard with Enrollment Logic

### Overview
Integrate auto-enrollment logic, course fetching, and CourseCard display in the dashboard. Users should see all available courses with contextual actions based on enrollment status.

### Changes Required:

#### 4.1 Update DashboardContent Component
**File**: `frontend/components/dashboard/DashboardContent.tsx`
**Changes**: Replace entire component with enrollment logic

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'motion/react';
import { LogOut, User, Mail, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import { enrollInCourse, getUserEnrollments, type Enrollment } from '@/app/actions/enrollments';
import { getAllCourses, type Course } from '@/app/actions/courses';
import { CourseCard } from './CourseCard';

interface DashboardContentProps {
  session: Session;
}

export function DashboardContent({ session }: DashboardContentProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userInitials = session.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  // Create enrollment lookup map for O(1) checks
  const enrollmentMap = new Map<string, Enrollment>();
  enrollments.forEach((enrollment) => {
    enrollmentMap.set(enrollment.courseId, enrollment);
  });

  useEffect(() => {
    async function initializeDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Check for pending enrollment in sessionStorage
        const pendingCourseId = sessionStorage.getItem('pendingEnrollmentCourseId');

        if (pendingCourseId) {
          console.log('Auto-enrolling in course:', pendingCourseId);
          const enrollResult = await enrollInCourse(pendingCourseId);

          if (enrollResult.success) {
            console.log('Auto-enrollment successful:', enrollResult);
          } else {
            console.error('Auto-enrollment failed:', enrollResult.error);
          }

          // Always clear sessionStorage after attempt (success or failure)
          sessionStorage.removeItem('pendingEnrollmentCourseId');
        }

        // Step 2: Fetch all courses
        const coursesResult = await getAllCourses();
        if (coursesResult) {
          setCourses(coursesResult);
        } else {
          setError('Failed to load courses');
        }

        // Step 3: Fetch user enrollments
        const enrollmentsResult = await getUserEnrollments();
        if (enrollmentsResult) {
          setEnrollments(enrollmentsResult);
        }
        // Note: enrollment fetch failure is not critical, just means empty enrollments

      } catch (err) {
        console.error('Dashboard initialization error:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    initializeDashboard();
  }, []); // Run once on mount

  // Handler for manual enrollment from course card
  const handleEnroll = async (courseId: string) => {
    const result = await enrollInCourse(courseId);

    if (result.success) {
      // Refresh enrollments to show updated state
      const updatedEnrollments = await getUserEnrollments();
      if (updatedEnrollments) {
        setEnrollments(updatedEnrollments);
      }
    } else {
      // Error will be shown in CourseCard component
      throw new Error(result.error || 'Failed to enroll');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome back, {session.user?.name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* User Info Card */}
        <Card className="p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={session.user?.image || undefined} />
                <AvatarFallback className="text-lg font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {session.user?.name || 'Student'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {session.user?.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <User className="w-4 h-4" />
                  User ID: {session.user?.id}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={signOutAction}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Courses Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Available Courses</h2>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading courses...</span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Card className="p-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold">Error Loading Courses</h3>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && courses.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No courses available at the moment.</p>
              </div>
            </Card>
          )}

          {/* Course Cards Grid */}
          {!isLoading && !error && courses.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={enrollmentMap.get(course.id)}
                  onEnroll={handleEnroll}
                />
              ))}
            </div>
          )}
        </div>

        {/* Session Debug Info (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="p-6 mt-8 bg-muted/50">
            <h3 className="font-semibold mb-2 text-sm">
              Session Info (Development Only)
            </h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
```

---

## Phase 4.b: Validation Tests

### Automated Tests
Run the following automated tests:
```bash
cd frontend
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm run test:coverage
```

### Manual Tests
**STOP** and execute these manual tests:

1. **Test email signup flow with auto-enrollment**:
   - Clear browser sessionStorage and cookies
   - Navigate to landing page
   - Click "Enroll Now" button
   - Verify sessionStorage contains `pendingEnrollmentCourseId: TEST-COURSE-001`
   - Complete email signup form
   - Verify email with code
   - Wait for redirect to dashboard
   - **Verify**: Dashboard loads, auto-enrollment triggers (check console logs)
   - **Verify**: Course card appears with "Enrolled" badge
   - **Verify**: sessionStorage is cleared (check DevTools)

2. **Test manual enrollment from dashboard**:
   - Sign in as existing user with no enrollments
   - Navigate to dashboard
   - **Verify**: Course cards show "Enroll Now" button
   - Click "Enroll Now" on a course card
   - **Verify**: Button shows loading state
   - **Verify**: After enrollment, card updates to show "Enrolled" badge and "Continue Course" button

3. **Test Continue Course button**:
   - On enrolled course card, click "Continue Course"
   - **Verify**: Navigates to `/course/TEST-COURSE-001`

4. **Test existing user flow**:
   - Sign out
   - Click "Enroll Now" on landing page
   - Navigate to `/signin` instead of `/enroll`
   - Sign in with existing credentials
   - **Verify**: Dashboard loads with auto-enrollment

5. **CRITICAL TEST: Google OAuth flow with sessionStorage**:
   - Sign out
   - Clear sessionStorage
   - Click "Enroll Now" on landing page
   - Verify sessionStorage contains courseId
   - On `/enroll` page, click Google sign-in button
   - Complete Google OAuth flow
   - **VERIFY CRITICAL**: After redirect back to app, check if sessionStorage still contains courseId
   - **VERIFY CRITICAL**: Dashboard loads and auto-enrollment triggers
   - **If sessionStorage is cleared by OAuth**: This is a BLOCKER that needs architectural solution

6. **Test error handling**:
   - Stop backend server
   - Try to enroll in a course from dashboard
   - **Verify**: Error message displays in course card
   - **Verify**: "Try Again" button appears

7. **Test loading states**:
   - Refresh dashboard
   - **Verify**: Loading spinner appears while fetching data
   - **Verify**: Smooth transition to course grid

---

## Phase 4.c: Manual Review and Optional Preview Deployment

**STOP** and ask user:
- Review the dashboard implementation
- Should we commit these changes?
- Should we deploy to preview environment?

### Success Criteria:
- [ ] Development Completed?
- [ ] All Validation Tests passing?
- [ ] Stopped and manually reviewed with user asking to commit and/or deploy to preview?

---

## Phase 5.a: Create Placeholder Course Page

### Overview
Create a minimal, protected course page that displays placeholder content for video player, curriculum, and progress tracking. This page should verify enrollment before allowing access.

### Changes Required:

#### 5.1 Create Course Page
**File**: `frontend/app/course/[courseId]/page.tsx` (new file)
**Changes**: Create complete course page

```typescript
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getCourse } from '@/app/actions/courses';
import { checkEnrollment } from '@/app/actions/enrollments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  ArrowLeft,
  PlayCircle,
  BookOpen,
  CheckCircle,
  Lock,
  Clock,
  Award
} from 'lucide-react';
import type { Metadata } from 'next';

interface CoursePageProps {
  params: {
    courseId: string;
  };
}

export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const course = await getCourse(params.courseId);

  return {
    title: course ? `${course.title} - LearnerMax` : 'Course - LearnerMax',
    description: course?.description || 'Access your course content',
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  // Check authentication
  const session = await auth();
  if (!session) {
    redirect(`/signin?callbackUrl=/course/${params.courseId}`);
  }

  // Check enrollment
  const isEnrolled = await checkEnrollment(params.courseId);
  if (!isEnrolled) {
    redirect('/dashboard?error=not-enrolled');
  }

  // Fetch course data
  const course = await getCourse(params.courseId);
  if (!course) {
    redirect('/dashboard?error=course-not-found');
  }

  // Mock curriculum data (in real implementation, fetch from backend)
  const mockModules = [
    { id: 1, title: 'Introduction to the Course', lessons: 5, completed: 0, duration: '45 min' },
    { id: 2, title: 'Getting Started', lessons: 8, completed: 0, duration: '1.5 hours' },
    { id: 3, title: 'Core Concepts', lessons: 12, completed: 0, duration: '2 hours' },
    { id: 4, title: 'Advanced Topics', lessons: 10, completed: 0, duration: '1.8 hours' },
    { id: 5, title: 'Final Project', lessons: 6, completed: 0, duration: '3 hours' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div className="hidden md:block">
                <h1 className="text-lg font-bold line-clamp-1">{course.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                {course.duration || 'Self-paced'}
              </Badge>
              <Progress value={0} className="w-24 hidden sm:block" />
              <span className="text-sm text-muted-foreground hidden sm:inline">0%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player Placeholder */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <PlayCircle className="w-20 h-20 text-primary/40" />
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">Video Player Coming Soon</h3>
                    <p className="text-sm text-muted-foreground">
                      Course content will be available here
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Course Info */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">{course.title}</h2>
              <p className="text-muted-foreground mb-6">{course.description}</p>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-primary" />
                  <span>{course.level || 'All Levels'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{course.duration || 'Self-paced'}</span>
                </div>
                {course.instructor && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Instructor:</span>
                    <span className="font-medium">{course.instructor}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Learning Outcomes Placeholder */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                What You'll Learn
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Course learning outcomes will be displayed here</li>
                <li>• Key skills and concepts covered</li>
                <li>• Practical applications and projects</li>
                <li>• Certification upon completion</li>
              </ul>
            </Card>
          </div>

          {/* Sidebar - Curriculum */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Course Curriculum
              </h3>

              <div className="space-y-3">
                {mockModules.map((module) => (
                  <div
                    key={module.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm line-clamp-2 flex-1">
                        {module.title}
                      </h4>
                      <Lock className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{module.lessons} lessons</span>
                      <span>•</span>
                      <span>{module.duration}</span>
                    </div>
                    <Progress
                      value={(module.completed / module.lessons) * 100}
                      className="h-1 mt-2"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Course Progress</p>
                  <div className="flex items-center justify-between">
                    <span>0 of {mockModules.reduce((sum, m) => sum + m.lessons, 0)} lessons completed</span>
                    <span className="font-semibold">0%</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 5.b: Validation Tests

### Automated Tests
Run the following automated tests:
```bash
cd frontend
pnpm run test
pnpm run lint
pnpm run typecheck
pnpm run test:coverage
```

### Manual Tests
**STOP** and execute these manual tests:

1. **Test protected route (not authenticated)**:
   - Sign out
   - Try to navigate directly to `/course/TEST-COURSE-001`
   - **Verify**: Redirects to `/signin?callbackUrl=/course/TEST-COURSE-001`

2. **Test protected route (not enrolled)**:
   - Sign in as user with no enrollments
   - Try to navigate directly to `/course/TEST-COURSE-001`
   - **Verify**: Redirects to `/dashboard?error=not-enrolled`

3. **Test enrolled access**:
   - Enroll in course from dashboard
   - Click "Continue Course" button
   - **Verify**: Course page loads successfully
   - **Verify**: Shows course title, description, placeholder video
   - **Verify**: Shows curriculum sidebar with modules
   - **Verify**: "Back to Dashboard" button works

4. **Test responsive design**:
   - View course page on mobile, tablet, desktop
   - **Verify**: Layout adapts (sidebar stacks on mobile)
   - **Verify**: Video player maintains aspect ratio

5. **Test invalid course ID**:
   - Navigate to `/course/INVALID-ID`
   - **Verify**: Redirects to `/dashboard?error=course-not-found`

---

## Phase 5.c: Final Manual Review and Production Deployment

**STOP** and execute complete E2E testing:

### Complete E2E Test Scenarios

1. **Full email signup enrollment flow**:
   - Clear all browser data
   - Landing page → Click "Enroll Now"
   - Verify sessionStorage set
   - Complete signup form
   - Verify email
   - Automatic sign-in
   - Dashboard loads → Auto-enroll triggers
   - Course card shows "Enrolled"
   - Click "Continue Course"
   - Course page displays correctly

2. **Existing user signin flow**:
   - Sign out
   - Landing page → Click "Enroll Now"
   - Navigate to signin (not signup)
   - Sign in
   - Dashboard loads → Auto-enroll triggers
   - Verify course appears as enrolled

3. **Google OAuth flow** (CRITICAL):
   - Sign out
   - Clear sessionStorage
   - Landing page → Click "Enroll Now"
   - Verify sessionStorage set
   - Click Google sign-in
   - Complete OAuth
   - **VERIFY**: sessionStorage persists after redirect
   - **VERIFY**: Auto-enroll triggers on dashboard
   - **If fails**: Document issue and discuss workaround

4. **Manual enrollment from dashboard**:
   - Sign in as user with no enrollments
   - Dashboard shows courses with "Enroll Now" button
   - Click "Enroll Now"
   - Verify loading state
   - Verify card updates to enrolled
   - Click "Continue Course"
   - Verify course page loads

5. **Multiple courses**:
   - If multiple courses exist in backend
   - Verify dashboard shows all courses
   - Enroll in multiple courses
   - Verify all show as enrolled
   - Navigate to each course page

### User Review
**STOP** and ask user:
- Review all code changes across all phases
- Test all user flows end-to-end
- Should we commit these changes?
- Should we deploy to production?

### Success Criteria:
- [ ] Development Completed?
- [ ] All Validation Tests passing (automated and manual)?
- [ ] E2E flows tested and working?
- [ ] Google OAuth sessionStorage persistence verified?
- [ ] Stopped and manually reviewed with user asking to commit and/or deploy to production?

---

## Testing Strategy

### Unit Tests
- Write tests for CourseCard component states
- Test enrollment server actions with mocked fetch
- Test sessionStorage helpers if extracted to utility functions
- Ensure test coverage meets project standards: `pnpm run test:coverage`

### Integration Tests
- Test dashboard enrollment flow with mocked API responses
- Test course page with mocked auth and enrollment checks
- Test error handling across components

### Manual Testing Steps

1. **Landing Page Enrollment Buttons**:
   - Click each button (Hero, CTA, Header)
   - Verify sessionStorage is set correctly
   - Verify navigation to `/enroll` (no query params)

2. **Email Signup Flow**:
   - Complete full signup → verification → dashboard flow
   - Verify auto-enrollment occurs
   - Verify course appears as enrolled
   - Verify sessionStorage cleared after enrollment

3. **Google OAuth Flow** (Critical):
   - Test if sessionStorage persists through external redirect
   - Document findings
   - If it doesn't persist, note as architectural limitation

4. **Manual Enrollment**:
   - Sign in as existing user
   - Enroll from dashboard course card
   - Verify immediate UI update
   - Verify enrollment persists on page refresh

5. **Course Page Access**:
   - Test protected route redirects
   - Test enrolled user can access course
   - Test unenrolled user cannot access course

6. **Error Scenarios**:
   - Backend down → verify error messages
   - Invalid course ID → verify redirect
   - Network error during enrollment → verify error handling

### Edge Cases to Test

1. **User clicks enroll multiple times before logging in**:
   - Should overwrite sessionStorage (only one courseId stored)

2. **User starts enrollment but never completes**:
   - sessionStorage persists until cleared manually or enrollment completes

3. **User enrolls, signs out, signs in again**:
   - Should see enrolled course on dashboard
   - Should be able to access course page

4. **Backend returns existing enrollment (idempotency)**:
   - Should handle gracefully, show as enrolled

5. **Slow network**:
   - Loading states should display
   - No double-enrollment on double-click

---

## References

- Related research: `specs/student_enrollment/slices/enrollment-frontend/research.md`
- Main spec: `specs/student_enrollment/slices/enrollment-frontend/single-course-free-enrollment.md`
- Backend enrollment API: `backend/src/features/enrollment/enrollment.routes.ts:12`
- Course fetching pattern: `frontend/app/actions/courses.ts:1`
- Auth token pattern: `frontend/app/actions/auth.ts:57-74`
- Dashboard structure: `frontend/components/dashboard/DashboardContent.tsx:1`
- Landing page components: `frontend/components/landing/HeroSection.tsx:1`, `CtaSection.tsx:1`
- Header component: `frontend/components/layout/Header.tsx:1`

---

## Implementation Notes

### SessionStorage Key
- Key name: `pendingEnrollmentCourseId`
- Value: Course ID string (e.g., `TEST-COURSE-001`)
- Lifecycle: Set on enroll button click → Cleared after enrollment attempt on dashboard

### Error Handling Philosophy
- **Auto-enrollment failures**: Logged only, no UI error shown (convenience feature)
- **Manual enrollment failures**: Show error in CourseCard with "Try Again" option
- **API failures**: Show error messages with option to retry or refresh

### Performance Considerations
- Use `cache: 'no-store'` for enrollment API calls (always fresh data)
- Consider adding loading skeletons for better UX
- Enrollment map uses O(1) lookup for enrollment checks

### Security Notes
- All API calls use bearer token authentication
- Backend validates enrollment permissions
- Course page verifies both authentication and enrollment
- Protected routes redirect to signin with callback URL

### Future Enhancements (Out of Scope)
- Implement actual video player
- Add lesson completion tracking
- Enable course progress persistence
- Add course reviews and ratings
- Implement course search and filtering
- Add wishlist/bookmark functionality
