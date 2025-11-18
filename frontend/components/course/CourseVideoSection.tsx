'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { Button } from '@/components/ui/button';
import { getProgress } from '@/app/actions/progress';
import { getNextLesson } from '@/lib/course-utils';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

interface CourseVideoSectionProps {
  courseId: string;
  initialLesson: LessonResponse;
  lessons: LessonResponse[];
  initialProgress: ProgressResponse;
}

/**
 * CourseVideoSection - Video player section with Next Lesson button
 * Client component that manages video playback and progress updates
 */
export function CourseVideoSection({
  courseId,
  initialLesson,
  lessons,
  initialProgress: _initialProgress,
}: CourseVideoSectionProps) {
  const [currentLesson, setCurrentLesson] = useState<LessonResponse>(initialLesson);
  const [isRefreshingProgress, setIsRefreshingProgress] = useState(false);

  // Update currentLesson when initialLesson changes (from URL navigation)
  useEffect(() => {
    setCurrentLesson(initialLesson);
  }, [initialLesson]);

  // Handle lesson completion
  const handleLessonComplete = async () => {
    console.log('[CourseVideoSection] Lesson completed, refetching progress');
    setIsRefreshingProgress(true);

    try {
      const updatedProgress = await getProgress(courseId);
      if ('error' in updatedProgress) {
        console.error('[CourseVideoSection] Failed to refetch progress:', updatedProgress.error);
      } else {
        // Progress successfully refetched (logged for debugging)
        // Note: Progress is managed by parent page component via server-side refetch
        console.log('[CourseVideoSection] Progress updated:', updatedProgress);
      }
    } catch (error) {
      console.error('[CourseVideoSection] Error refetching progress:', error);
    } finally {
      setIsRefreshingProgress(false);
    }
  };

  // Handle course completion (100%)
  const handleCourseComplete = () => {
    console.log('[CourseVideoSection] Course 100% complete!');
    // TODO: Show premium upsell modal (Phase 3)
    // For now, just log
  };

  // Get next lesson
  const nextLesson = getNextLesson(lessons, currentLesson.lessonId);

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Lesson title */}
      <h2 className="text-2xl font-bold">{currentLesson.title}</h2>

      {/* Video player */}
      <VideoPlayer
        lessonId={currentLesson.lessonId}
        courseId={courseId}
        onLessonComplete={handleLessonComplete}
        onCourseComplete={handleCourseComplete}
      />

      {/* Next Lesson button */}
      {nextLesson && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Up Next</p>
            <p className="font-medium">{nextLesson.title}</p>
            {nextLesson.lengthInMins && (
              <p className="text-xs text-muted-foreground">{nextLesson.lengthInMins} min</p>
            )}
          </div>
          <Link href={`/course/${courseId}?lesson=${nextLesson.lessonId}`}>
            <Button>
              Next Lesson <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Lesson description */}
      {currentLesson.description && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">About this lesson</h3>
          <p className="text-muted-foreground">{currentLesson.description}</p>
        </div>
      )}

      {/* Debug info (optional, can be removed) */}
      {isRefreshingProgress && (
        <p className="text-xs text-muted-foreground">Updating progress...</p>
      )}
    </div>
  );
}
