# Slice 4: Create SWR Hooks with Optimistic Updates

## Objective

Create SWR hooks for user-specific data with optimistic updates for instant UI feedback.

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/hooks/useStudent.ts` | Student data with optimistic premium interest |
| `frontend/hooks/useEnrollments.ts` | Enrollments with optimistic enroll |
| `frontend/hooks/useProgress.ts` | Progress with optimistic lesson complete |
| `frontend/lib/swr-config.tsx` | SWRConfig provider wrapper |
| `frontend/lib/fetchers.ts` | Fetch functions for SWR |

## How SWR Caching Works

| Scenario | Behavior |
|----------|----------|
| First visit | Fetch from server, cache in memory |
| Navigation within app | Return cached data **immediately** (no loading) |
| Tab back to app | Return cached data, revalidate in background |
| After mutation | Optimistic update -> server call -> revalidate to confirm |

## Implementation

### lib/fetchers.ts

```typescript
// frontend/lib/fetchers.ts
import { getStudent } from '@/lib/data/students';
import { getUserEnrollments } from '@/lib/data/enrollments';
import { getProgress } from '@/lib/data/progress';

// These fetchers are called from SWR hooks
// They handle auth token internally since they're called client-side

export async function fetchStudent() {
  const response = await fetch('/api/student');
  if (!response.ok) throw new Error('Failed to fetch student');
  return response.json();
}

export async function fetchEnrollments() {
  const response = await fetch('/api/enrollments');
  if (!response.ok) throw new Error('Failed to fetch enrollments');
  return response.json();
}

export async function fetchProgress(courseId: string) {
  const response = await fetch(`/api/progress/${courseId}`);
  if (!response.ok) throw new Error('Failed to fetch progress');
  return response.json();
}
```

### lib/swr-config.tsx

```typescript
// frontend/lib/swr-config.tsx
'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 2000,
        errorRetryCount: 3,
      }}
    >
      {children}
    </SWRConfig>
  );
}
```

### hooks/useStudent.ts

```typescript
// frontend/hooks/useStudent.ts
'use client';

import useSWR from 'swr';
import { fetchStudent } from '@/lib/fetchers';
import { signUpForEarlyAccess } from '@/app/actions/mutations/students';

export interface Student {
  studentId: string;
  userId: string;
  email: string;
  name?: string;
  interestedInPremium?: boolean;
  premiumInterestDate?: string;
  signedUpMeetups: string[];  // NEW: from Slice 5
  createdAt: string;
  updatedAt: string;
}

export function useStudent() {
  const { data, error, mutate, isLoading } = useSWR<Student>(
    'student',
    fetchStudent,
    { revalidateOnFocus: true }
  );

  const setInterestedInPremium = async () => {
    if (!data) return;

    // Optimistic update - instant UI feedback
    mutate(
      { ...data, interestedInPremium: true, premiumInterestDate: new Date().toISOString() },
      false // Don't revalidate yet
    );

    // Server mutation
    await signUpForEarlyAccess();

    // Revalidate to confirm server state
    mutate();
  };

  return {
    student: data,
    isLoading,
    error,
    signedUpMeetups: data?.signedUpMeetups ?? [],
    interestedInPremium: data?.interestedInPremium ?? false,
    setInterestedInPremium,
  };
}
```

### hooks/useEnrollments.ts

```typescript
// frontend/hooks/useEnrollments.ts
'use client';

import useSWR from 'swr';
import { fetchEnrollments } from '@/lib/fetchers';
import { enrollInCourse } from '@/app/actions/mutations/enrollments';

export interface Enrollment {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid';
  enrolledAt: string;
  paymentStatus: 'free' | 'pending' | 'completed' | 'failed';
  progress: number;
  completed: boolean;
}

export function useEnrollments() {
  const { data, error, mutate, isLoading } = useSWR<Enrollment[]>(
    'enrollments',
    fetchEnrollments,
    { revalidateOnFocus: true }
  );

  const enroll = async (courseId: string) => {
    // Optimistic update - show enrolled immediately
    const optimisticEnrollment: Enrollment = {
      userId: '', // Will be filled by server
      courseId,
      enrollmentType: 'free',
      enrolledAt: new Date().toISOString(),
      paymentStatus: 'free',
      progress: 0,
      completed: false,
    };

    mutate([...(data || []), optimisticEnrollment], false);

    // Server mutation
    const result = await enrollInCourse(courseId);

    if ('error' in result) {
      // Rollback on error
      mutate();
      throw new Error(result.error);
    }

    // Revalidate to get server-confirmed data
    mutate();

    return result;
  };

  const isEnrolled = (courseId: string) => {
    return data?.some((e) => e.courseId === courseId) ?? false;
  };

  const getEnrollment = (courseId: string) => {
    return data?.find((e) => e.courseId === courseId);
  };

  return {
    enrollments: data ?? [],
    isLoading,
    error,
    enroll,
    isEnrolled,
    getEnrollment,
  };
}
```

### hooks/useProgress.ts

```typescript
// frontend/hooks/useProgress.ts
'use client';

import useSWR from 'swr';
import { fetchProgress } from '@/lib/fetchers';
import { markLessonComplete, trackLessonAccess } from '@/app/actions/mutations/progress';

export interface ProgressResponse {
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;
  totalLessons: number;
  updatedAt: string;
}

export function useProgress(courseId: string | null) {
  const { data, error, mutate, isLoading } = useSWR<ProgressResponse>(
    courseId ? `progress-${courseId}` : null,
    () => (courseId ? fetchProgress(courseId) : null),
    { revalidateOnFocus: true }
  );

  const markComplete = async (lessonId: string) => {
    if (!data || !courseId) return;

    // Optimistic update - instantly show lesson complete
    const newCompleted = [...data.completedLessons];
    if (!newCompleted.includes(lessonId)) {
      newCompleted.push(lessonId);
    }
    const newPercentage = Math.round((newCompleted.length / data.totalLessons) * 100);

    mutate(
      {
        ...data,
        completedLessons: newCompleted,
        percentage: newPercentage,
        lastAccessedLesson: lessonId,
        updatedAt: new Date().toISOString(),
      },
      false
    );

    // Server mutation
    const result = await markLessonComplete(courseId, lessonId);

    if ('error' in result) {
      // Rollback on error
      mutate();
      throw new Error(result.error);
    }

    // Revalidate to confirm
    mutate();

    return result;
  };

  const trackAccess = async (lessonId: string) => {
    if (!courseId || !data) return;

    // Optimistic update - update lastAccessedLesson immediately
    // This ensures prefetch URL is correct when user returns to dashboard
    mutate(
      {
        ...data,
        lastAccessedLesson: lessonId,
      },
      false // Don't revalidate yet
    );

    // Fire to server (no need to wait for response)
    trackLessonAccess(courseId, lessonId);
  };

  const isLessonCompleted = (lessonId: string) => {
    return data?.completedLessons.includes(lessonId) ?? false;
  };

  return {
    progress: data,
    isLoading,
    error,
    markComplete,
    trackAccess,
    isLessonCompleted,
    percentage: data?.percentage ?? 0,
    completedCount: data?.completedLessons.length ?? 0,
    totalLessons: data?.totalLessons ?? 0,
  };
}
```

## Add SWRProvider to Layout

```typescript
// frontend/app/layout.tsx (or appropriate layout)
import { SWRProvider } from '@/lib/swr-config';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SWRProvider>
          {children}
        </SWRProvider>
      </body>
    </html>
  );
}
```

## Acceptance Criteria

- [ ] `lib/swr-config.tsx` created with SWRProvider
- [ ] `lib/fetchers.ts` created with fetch functions
- [ ] `hooks/useStudent.ts` created with optimistic `setInterestedInPremium`
- [ ] `hooks/useEnrollments.ts` created with optimistic `enroll`
- [ ] `hooks/useProgress.ts` created with optimistic `markComplete`
- [ ] SWRProvider added to app layout
- [ ] Hooks work correctly in client components

## Notes

- Hooks are `'use client'` - they use React hooks
- Optimistic updates show changes immediately, then confirm with server
- Error handling rolls back optimistic updates on failure
- `revalidateOnFocus: true` refreshes data when user tabs back
