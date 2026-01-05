# Slice 7: Course Page Migration

## Objective

Migrate the course page to use Cache Components for static data (course, lessons) and SWR for user-specific data (progress).

## Files to Modify

| File | Change |
|------|--------|
| `frontend/app/course/[courseId]/page.tsx` | Parallel cached fetching |
| `frontend/components/course/CourseVideoSection.tsx` | Use SWR progress hook |
| `frontend/components/course/LessonList.tsx` | Use SWR progress hook |
| `frontend/components/course/VideoPlayer.tsx` | Use SWR progress.markComplete |

## Architecture

```
Course Page (Server Component)
├── auth() - Get session
├── getAuthToken() - Get token for cached functions
├── Promise.all([
│   getCourse(token, courseId),    // [cached - 'use cache']
│   getLessons(token, courseId),   // [cached - 'use cache']
│   checkEnrollment(token, courseId),  // [not cached - user-specific]
│ ])
├── Redirect if not enrolled
└── <CourseContent course={course} lessons={lessons}>
    ├── useProgress(courseId) [SWR - client-side]
    └── <VideoPlayer onComplete={progress.markComplete} />
```

## Implementation

### course/[courseId]/page.tsx

```typescript
// frontend/app/course/[courseId]/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getAuthToken } from '@/app/actions/auth';
import { getCourse } from '@/lib/data/courses';
import { getLessons } from '@/lib/data/lessons';
import { checkEnrollment } from '@/lib/data/enrollments';
import { CourseContent } from '@/components/course/CourseContent';
import { AuthenticatedHeader } from '@/components/AuthenticatedHeader';

interface CoursePageProps {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ lesson?: string }>;
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { courseId } = await params;
  const search = await searchParams;
  const requestedLesson = search?.lesson;

  const session = await auth();
  if (!session?.user) {
    redirect('/signin');
  }

  const token = await getAuthToken();
  if (!token) {
    redirect('/signin');
  }

  // Fetch ALL data in parallel (no sequential waterfalls)
  const [courseResult, lessonsResult, enrollmentResult] = await Promise.all([
    getCourse(token, courseId),
    getLessons(token, courseId),
    checkEnrollment(token, courseId),
  ]);

  // Handle errors
  if ('error' in courseResult) {
    redirect('/dashboard?error=course-not-found');
  }
  if ('error' in lessonsResult) {
    redirect('/dashboard?error=lessons-not-found');
  }
  if (!enrollmentResult.isEnrolled) {
    redirect(`/dashboard?error=not-enrolled&course=${courseId}`);
  }

  const course = courseResult.course;
  const lessons = lessonsResult.lessons;

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedHeader />
      <CourseContent
        course={course}
        lessons={lessons}
        requestedLesson={requestedLesson}
      />
    </div>
  );
}
```

### CourseContent.tsx (new component)

```typescript
// frontend/components/course/CourseContent.tsx
'use client';

import { useProgress } from '@/hooks/useProgress';
import { Course } from '@/lib/data/courses';
import { LessonResponse } from '@/lib/data/lessons';
import { CourseVideoSection } from './CourseVideoSection';
import { CollapsibleLessonSidebar } from './CollapsibleLessonSidebar';
import { determineCurrentLesson } from '@/lib/course-utils';

interface CourseContentProps {
  course: Course;
  lessons: LessonResponse[];
  requestedLesson?: string;
}

export function CourseContent({ course, lessons, requestedLesson }: CourseContentProps) {
  const { progress, markComplete, trackAccess, isLessonCompleted } = useProgress(course.courseId);

  // Determine which lesson to show
  const currentLesson = determineCurrentLesson(lessons, progress, { lesson: requestedLesson });

  if (!currentLesson) {
    return <div>No lessons available</div>;
  }

  return (
    <div className="flex">
      {/* Sidebar */}
      <CollapsibleLessonSidebar
        course={course}
        lessons={lessons}
        currentLesson={currentLesson}
        progress={progress}
        isLessonCompleted={isLessonCompleted}
      />

      {/* Main content */}
      <main className="flex-1 p-6">
        <CourseVideoSection
          course={course}
          lessons={lessons}
          currentLesson={currentLesson}
          progress={progress}
          onLessonComplete={() => markComplete(currentLesson.lessonId)}
          onLessonAccess={() => trackAccess(currentLesson.lessonId)}
        />
      </main>
    </div>
  );
}
```

### CourseVideoSection.tsx (use SWR progress)

```typescript
// frontend/components/course/CourseVideoSection.tsx
'use client';

import { useState } from 'react';
import { useStudent } from '@/hooks/useStudent';
import { Course } from '@/lib/data/courses';
import { LessonResponse } from '@/lib/data/lessons';
import { ProgressResponse } from '@/hooks/useProgress';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { getNextLesson } from '@/lib/course-utils';
import { useRouter } from 'next/navigation';

interface CourseVideoSectionProps {
  course: Course;
  lessons: LessonResponse[];
  currentLesson: LessonResponse;
  progress?: ProgressResponse;
  onLessonComplete: () => Promise<void>;
  onLessonAccess: () => void;
}

export function CourseVideoSection({
  course,
  lessons,
  currentLesson,
  progress,
  onLessonComplete,
  onLessonAccess,
}: CourseVideoSectionProps) {
  const router = useRouter();
  const { interestedInPremium, setInterestedInPremium } = useStudent();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  const nextLesson = getNextLesson(lessons, currentLesson.lessonId);
  const isLastLesson = !nextLesson;
  const isCompleted = progress?.completedLessons.includes(currentLesson.lessonId) ?? false;

  const handleVideoComplete = async () => {
    await onLessonComplete();

    if (isLastLesson) {
      setShowConfetti(true);
      if (course.pricingModel === 'free') {
        setShowUpsellModal(true);
      }
    }
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      router.push(`/course/${course.courseId}?lesson=${nextLesson.lessonId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <VideoPlayer
        courseId={course.courseId}
        lessonId={currentLesson.lessonId}
        isLastLesson={isLastLesson}
        onComplete={handleVideoComplete}
        onAccess={onLessonAccess}
      />

      {/* Lesson Info */}
      <div>
        <h1 className="text-2xl font-bold">{currentLesson.title}</h1>
        {currentLesson.description && (
          <p className="text-muted-foreground mt-2">{currentLesson.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        {isCompleted && nextLesson && (
          <Button onClick={handleNextLesson}>
            Next Lesson: {nextLesson.title}
          </Button>
        )}
        {isLastLesson && isCompleted && (
          <Button variant="secondary" disabled>
            Course Complete!
          </Button>
        )}
      </div>

      {/* Confetti and Upsell Modal... */}
    </div>
  );
}
```

### VideoPlayer.tsx (use SWR via props)

```typescript
// frontend/components/course/VideoPlayer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { getVideoUrl } from '@/lib/data/lessons';

interface VideoPlayerProps {
  courseId: string;
  lessonId: string;
  isLastLesson: boolean;
  onComplete: () => Promise<void>;
  onAccess: () => void;
}

export function VideoPlayer({
  courseId,
  lessonId,
  isLastLesson,
  onComplete,
  onAccess,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  const isMarkingComplete = useRef(false);

  // Track lesson access on mount
  useEffect(() => {
    onAccess();
  }, [lessonId, onAccess]);

  // Fetch video URL
  useEffect(() => {
    setIsLoading(true);
    setHasMarkedComplete(false);

    getVideoUrl(lessonId).then((result) => {
      if ('videoUrl' in result) {
        setVideoUrl(result.videoUrl);
      }
      setIsLoading(false);
    });
  }, [lessonId]);

  // Handle 90% completion
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = async () => {
      const played = video.currentTime / video.duration;

      if (played >= 0.9 && !hasMarkedComplete && !isMarkingComplete.current) {
        isMarkingComplete.current = true;
        setHasMarkedComplete(true);
        await onComplete();
        isMarkingComplete.current = false;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [hasMarkedComplete, onComplete]);

  if (isLoading) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center">
        <p className="text-white">Failed to load video</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      controls
      className="w-full aspect-video bg-black"
    />
  );
}
```

### LessonList.tsx (use SWR isLessonCompleted)

```typescript
// frontend/components/course/LessonList.tsx
'use client';

import Link from 'next/link';
import { LessonResponse } from '@/lib/data/lessons';
import { ProgressResponse } from '@/hooks/useProgress';
import { CheckCircle, Circle, PlayCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LessonListProps {
  courseId: string;
  lessons: LessonResponse[];
  currentLesson: LessonResponse;
  progress?: ProgressResponse;
  isLessonCompleted: (lessonId: string) => boolean;
}

export function LessonList({
  courseId,
  lessons,
  currentLesson,
  progress,
  isLessonCompleted,
}: LessonListProps) {
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Course Progress</span>
          <span>{progress?.percentage ?? 0}%</span>
        </div>
        <Progress value={progress?.percentage ?? 0} />
        <p className="text-xs text-muted-foreground">
          {progress?.completedLessons.length ?? 0} of {lessons.length} lessons
        </p>
      </div>

      {/* Lesson list */}
      <nav className="space-y-1">
        {sortedLessons.map((lesson) => {
          const isCurrent = lesson.lessonId === currentLesson.lessonId;
          const isComplete = isLessonCompleted(lesson.lessonId);

          return (
            <Link
              key={lesson.lessonId}
              href={`/course/${courseId}?lesson=${lesson.lessonId}`}
              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-accent ${
                isCurrent ? 'bg-accent' : ''
              }`}
            >
              {/* Status icon */}
              {isCurrent ? (
                <PlayCircle className="w-5 h-5 text-primary" />
              ) : isComplete ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground" />
              )}

              {/* Lesson info */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{lesson.title}</p>
                {lesson.lengthInMins && (
                  <p className="text-xs text-muted-foreground">
                    {lesson.lengthInMins} min
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

## Key Changes from Current Implementation

| Before | After |
|--------|-------|
| Sequential: auth -> enrollment -> course | Parallel: all three at once |
| Progress fetched on server | Progress via SWR hook |
| `markLessonComplete` direct call | Via SWR `progress.markComplete` (optimistic) |
| `trackLessonAccess` in VideoPlayer | Passed as callback from CourseContent |
| 250ms wasted in sequential calls | ~100ms parallel calls |

## Acceptance Criteria

- [ ] Course page fetches course/lessons/enrollment in parallel
- [ ] CourseContent uses `useProgress()` hook
- [ ] VideoPlayer calls `onComplete` prop (from SWR hook)
- [ ] LessonList uses `isLessonCompleted` from SWR hook
- [ ] Progress updates optimistically
- [ ] Page loads faster (parallel fetching)

## Notes

- Depends on Slice 2 (cached data functions) and Slice 4 (SWR hooks)
- The `checkEnrollment` call is NOT cached (user-specific)
- Video URL fetching remains unchanged (signed URLs expire)
