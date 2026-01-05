# Slice 6: Dashboard Page Migration

## Objective

Migrate the dashboard page to use Cache Components for static data (courses, meetups) and SWR for user-specific data (enrollments, progress).

## Files to Modify

| File | Change |
|------|--------|
| `frontend/app/dashboard/page.tsx` | SSR with cached data fetching |
| `frontend/components/dashboard/DashboardContent.tsx` | Use SWR hooks instead of useEffect |
| `frontend/components/dashboard/CourseCard.tsx` | Use SWR progress hook |
| `frontend/components/dashboard/MeetupCard.tsx` | Derive isSignedUp from useStudent |

## Architecture

```
Dashboard Page (Server Component)
├── auth() - Get session
├── getAuthToken() - Get token for cached functions
├── getAllCourses(token) [cached - 'use cache']
├── getMeetups() [cached - 'use cache', cacheLife('minutes')]
├── <Suspense fallback={<DashboardSkeleton />}>
│   └── <DashboardContent courses={courses} meetups={meetups}>
│       ├── useStudent() [SWR - signedUpMeetups, interestedInPremium]
│       ├── useEnrollments() [SWR - enrollment data]
│       └── useProgress(courseId) [SWR - per enrolled course]
└── </Suspense>
```

## Implementation

### dashboard/page.tsx

```typescript
// frontend/app/dashboard/page.tsx
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getAuthToken } from '@/app/actions/auth';
import { getAllCourses } from '@/lib/data/courses';
import { getMeetups } from '@/lib/data/meetups';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { AuthenticatedHeader } from '@/components/AuthenticatedHeader';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/signin');
  }

  // Get auth token for cached API calls
  const token = await getAuthToken();
  if (!token) {
    redirect('/signin');
  }

  // Fetch cached data in parallel
  const [coursesResult, meetupsResult] = await Promise.all([
    getAllCourses(token),
    getMeetups(),  // No token needed - meetups are public after Slice 5
  ]);

  // Handle errors
  if ('error' in coursesResult) {
    return <div>Error loading courses: {coursesResult.error}</div>;
  }

  const courses = coursesResult.courses;
  const meetups = Array.isArray(meetupsResult) ? meetupsResult : [];

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedHeader />
      <main className="container mx-auto px-4 py-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent
            courses={courses}
            meetups={meetups}
            userName={session.user.name || session.user.email || 'Student'}
          />
        </Suspense>
      </main>
    </div>
  );
}
```

### DashboardContent.tsx

```typescript
// frontend/components/dashboard/DashboardContent.tsx
'use client';

import { useEnrollments } from '@/hooks/useEnrollments';
import { useStudent } from '@/hooks/useStudent';
import { Course } from '@/lib/data/courses';
import { MeetupResponse } from '@/lib/data/meetups';
import { CourseCard } from './CourseCard';
import { MeetupCard } from './MeetupCard';
import { PremiumCourseCard } from './PremiumCourseCard';

interface DashboardContentProps {
  courses: Course[];
  meetups: MeetupResponse[];
  userName: string;
}

export function DashboardContent({ courses, meetups, userName }: DashboardContentProps) {
  const { enrollments, enroll, isLoading: enrollmentsLoading } = useEnrollments();
  const { student, interestedInPremium, setInterestedInPremium } = useStudent();

  // Create enrollment lookup map
  const enrollmentMap = new Map(enrollments.map((e) => [e.courseId, e]));

  // Separate enrolled and available courses
  const enrolledCourses = courses.filter((c) => enrollmentMap.has(c.courseId));
  const availableCourses = courses.filter(
    (c) => !enrollmentMap.has(c.courseId) && !c.comingSoon
  );
  const comingSoonCourses = courses.filter((c) => c.comingSoon);

  const handleEnroll = async (courseId: string) => {
    await enroll(courseId);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section>
        <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
        <p className="text-muted-foreground mt-2">
          Continue your learning journey
        </p>
      </section>

      {/* Enrolled Courses */}
      {enrolledCourses.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Continue Learning</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <CourseCard
                key={course.courseId}
                course={course}
                enrollment={enrollmentMap.get(course.courseId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Available Courses */}
      {availableCourses.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Available Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course) => (
              <CourseCard
                key={course.courseId}
                course={course}
                onEnroll={handleEnroll}
              />
            ))}
          </div>
        </section>
      )}

      {/* Coming Soon / Premium */}
      {comingSoonCourses.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comingSoonCourses.map((course) => (
              <PremiumCourseCard
                key={course.courseId}
                course={course}
                isInterested={interestedInPremium}
                onInterested={setInterestedInPremium}
              />
            ))}
          </div>
        </section>
      )}

      {/* Meetups */}
      {meetups.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Upcoming Meetups</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {meetups.map((meetup) => (
              <MeetupCard key={meetup.meetupId} meetup={meetup} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

### CourseCard.tsx (with SWR progress)

```typescript
// frontend/components/dashboard/CourseCard.tsx
'use client';

import { useProgress } from '@/hooks/useProgress';
import { useEnrollments } from '@/hooks/useEnrollments';
import { Course } from '@/lib/data/courses';
import { Enrollment } from '@/hooks/useEnrollments';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment;
  onEnroll?: (courseId: string) => Promise<void>;
}

export function CourseCard({ course, enrollment, onEnroll }: CourseCardProps) {
  const { isEnrolled } = useEnrollments();
  const { progress, percentage } = useProgress(
    isEnrolled(course.courseId) ? course.courseId : null
  );

  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnroll = async () => {
    if (!onEnroll) return;
    setIsEnrolling(true);
    try {
      await onEnroll(course.courseId);
    } finally {
      setIsEnrolling(false);
    }
  };

  // Enrolled state
  if (enrollment || isEnrolled(course.courseId)) {
    return (
      <Link href={`/course/${course.courseId}`}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle>{course.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{course.description}</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{percentage}%</span>
              </div>
              <Progress value={percentage} />
            </div>
            <Button className="w-full mt-4" variant="secondary">
              Continue Learning
            </Button>
          </CardContent>
        </Card>
      </Link>
    );
  }

  // Not enrolled state
  return (
    <Card>
      <CardHeader>
        <CardTitle>{course.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{course.description}</p>
        <Button
          className="w-full"
          onClick={handleEnroll}
          disabled={isEnrolling}
        >
          {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### MeetupCard.tsx (derive isSignedUp from useStudent)

```typescript
// frontend/components/dashboard/MeetupCard.tsx
'use client';

import { useState } from 'react';
import { useStudent } from '@/hooks/useStudent';
import { signupForMeetup } from '@/app/actions/mutations/meetups';
import { MeetupResponse } from '@/lib/data/meetups';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MeetupCardProps {
  meetup: MeetupResponse;
}

export function MeetupCard({ meetup }: MeetupCardProps) {
  const { signedUpMeetups, mutate: mutateStudent } = useStudent();
  const isSignedUp = signedUpMeetups.includes(meetup.meetupId);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleSignup = async () => {
    setIsSigningUp(true);
    try {
      await signupForMeetup(meetup.meetupId);
      // Revalidate student to get updated signedUpMeetups
      mutateStudent();
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{meetup.title}</CardTitle>
          {meetup.isRunning && <Badge variant="destructive">Live Now</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{meetup.description}</p>
        <div className="text-sm text-muted-foreground mb-4">
          <p>Next: {new Date(meetup.nextOccurrence).toLocaleDateString()}</p>
          <p>Host: {meetup.hostName}</p>
          <p>Duration: {meetup.duration} minutes</p>
        </div>

        {isSignedUp ? (
          <div className="space-y-2">
            <Badge variant="secondary" className="w-full justify-center py-2">
              Signed Up
            </Badge>
            {meetup.isRunning && meetup.zoomLink && (
              <Button asChild className="w-full">
                <a href={meetup.zoomLink} target="_blank" rel="noopener">
                  Join Meetup
                </a>
              </Button>
            )}
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={handleSignup}
            disabled={isSigningUp}
          >
            {isSigningUp ? 'Signing up...' : 'Sign Up'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

## Key Changes from Current Implementation

| Before | After |
|--------|-------|
| All data fetched in `useEffect` | Static data fetched SSR with cache |
| Sequential API calls | Parallel cached calls |
| No caching | Courses/meetups cached |
| `isSignedUp` from API | Derived from `useStudent().signedUpMeetups` |
| Progress fetched per course in loop | SWR hook per enrolled course |

## Acceptance Criteria

- [ ] Dashboard page fetches courses/meetups on server with cache
- [ ] DashboardContent uses SWR hooks for user-specific data
- [ ] CourseCard uses `useProgress()` for progress display
- [ ] MeetupCard derives `isSignedUp` from `useStudent().signedUpMeetups`
- [ ] Enrollment works with optimistic updates
- [ ] Page loads faster (courses visible immediately)

## Notes

- Depends on Slice 2 (cached data functions) and Slice 4 (SWR hooks)
- Depends on Slice 5 (signedUpMeetups in Student response)
- The `<Suspense>` boundary shows skeleton while SWR hooks hydrate
