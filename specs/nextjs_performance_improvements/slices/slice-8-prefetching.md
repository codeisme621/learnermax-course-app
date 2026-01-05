# Slice 8: Prefetching Course Pages from Dashboard

## Objective

Add `router.prefetch()` to CourseCard to pre-load course pages before user clicks, enabling instant navigation.

## Files to Modify

| File | Change |
|------|--------|
| `frontend/components/dashboard/CourseCard.tsx` | Add prefetch on render |
| `frontend/lib/course-utils.ts` | Add `computePrefetchUrl()` helper |

## Background

Currently, when a user clicks on a course from the dashboard:
1. Browser navigates to `/course/{courseId}`
2. Server fetches course, lessons, progress
3. Page renders

With prefetching:
1. When CourseCard renders, we call `router.prefetch()`
2. Next.js pre-loads the route data in background
3. When user clicks, navigation is **instant**

## Implementation

### course-utils.ts (add helper)

```typescript
// frontend/lib/course-utils.ts

import { ProgressResponse } from '@/hooks/useProgress';

// ... existing functions ...

/**
 * Compute the URL to prefetch for a course.
 * Uses lastAccessedLesson if available for direct lesson navigation.
 */
export function computePrefetchUrl(
  courseId: string,
  progress?: ProgressResponse
): string {
  const baseUrl = `/course/${courseId}`;

  // If we have progress with lastAccessedLesson, go directly there
  if (progress?.lastAccessedLesson) {
    return `${baseUrl}?lesson=${progress.lastAccessedLesson}`;
  }

  // Otherwise, just prefetch the base course URL
  // (course page will determine the correct lesson)
  return baseUrl;
}
```

### CourseCard.tsx (add prefetch)

```typescript
// frontend/components/dashboard/CourseCard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProgress } from '@/hooks/useProgress';
import { useEnrollments } from '@/hooks/useEnrollments';
import { computePrefetchUrl } from '@/lib/course-utils';
import { Course } from '@/lib/data/courses';
import { Enrollment } from '@/hooks/useEnrollments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment;
  onEnroll?: (courseId: string) => Promise<void>;
}

export function CourseCard({ course, enrollment, onEnroll }: CourseCardProps) {
  const router = useRouter();
  const { isEnrolled } = useEnrollments();
  const enrolled = enrollment || isEnrolled(course.courseId);

  // Only fetch progress if enrolled
  const { progress, percentage } = useProgress(
    enrolled ? course.courseId : null
  );

  const [isEnrolling, setIsEnrolling] = useState(false);

  // Compute prefetch URL using lastAccessedLesson from progress
  const prefetchUrl = computePrefetchUrl(course.courseId, progress);

  // PREFETCH IMMEDIATELY on render for enrolled courses
  useEffect(() => {
    if (enrolled && prefetchUrl) {
      router.prefetch(prefetchUrl);
    }
  }, [enrolled, prefetchUrl, router]);

  const handleEnroll = async () => {
    if (!onEnroll) return;
    setIsEnrolling(true);
    try {
      await onEnroll(course.courseId);
    } finally {
      setIsEnrolling(false);
    }
  };

  // Enrolled state - show progress and link to course
  if (enrolled) {
    return (
      <Link href={prefetchUrl}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
          <CardHeader>
            <CardTitle className="line-clamp-2">{course.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground line-clamp-2">
              {course.description}
            </p>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{percentage}%</span>
              </div>
              <Progress value={percentage} />
            </div>

            <Button className="w-full" variant="secondary">
              {percentage > 0 ? 'Continue Learning' : 'Start Course'}
            </Button>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Not enrolled state - show enroll button
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="line-clamp-2">{course.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground line-clamp-2">
          {course.description}
        </p>

        <div className="text-sm text-muted-foreground">
          <p>Instructor: {course.instructor}</p>
          {course.totalLessons && <p>{course.totalLessons} lessons</p>}
        </div>

        <Button
          className="w-full"
          onClick={handleEnroll}
          disabled={isEnrolling}
        >
          {isEnrolling ? 'Enrolling...' : 'Enroll Now - Free'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

## How Prefetching Works

```
Dashboard Renders
    ↓
CourseCard mounts for each enrolled course
    ↓
useProgress() returns progress with lastAccessedLesson
    ↓
computePrefetchUrl() generates: /course/xyz?lesson=lesson-3
    ↓
useEffect calls router.prefetch(prefetchUrl)
    ↓
Next.js pre-loads route data in background
    ↓
User clicks "Continue Learning"
    ↓
INSTANT navigation (data already loaded!)
```

## Why Immediate Prefetch (Not Hover)?

1. **Data already available**: Progress data is loaded via SWR on dashboard
2. **Cheap operation**: Prefetch just populates Next.js cache
3. **High intent**: Enrolled students will likely click their course
4. **Better UX**: Instant navigation feels faster than hover-then-wait

## Prefetch Timing

| Event | What Happens |
|-------|--------------|
| CourseCard mounts | `router.prefetch()` called |
| SWR returns progress | URL updates with `lastAccessedLesson`, new prefetch |
| User navigates away | Prefetch cache may expire (Next.js manages this) |
| User returns | Fresh prefetch on mount |

## Acceptance Criteria

- [ ] `computePrefetchUrl()` helper added to course-utils.ts
- [ ] CourseCard calls `router.prefetch()` on render for enrolled courses
- [ ] Prefetch URL includes `?lesson={lastAccessedLesson}` when available
- [ ] Navigation from dashboard to course is noticeably faster
- [ ] No prefetch for unenrolled courses (they can't access anyway)

## Testing

1. Open browser DevTools Network tab
2. Navigate to dashboard
3. Look for prefetch requests to `/course/...`
4. Click on a course - should be instant

## Notes

- Depends on Slice 4 (SWR hooks for progress data)
- Prefetch only happens for enrolled courses
- Next.js automatically manages prefetch cache expiration
- Multiple prefetches for the same URL are deduplicated
