import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

/**
 * Determines which lesson should be displayed based on priority:
 * 1. Query param (?lesson=lessonId) - if provided and valid
 * 2. Last accessed lesson from progress - if not completed
 * 3. First uncompleted lesson
 * 4. First lesson (fallback)
 *
 * @param lessons - Array of all lessons in the course
 * @param progress - Student's progress for the course
 * @param searchParams - URL search parameters (may contain ?lesson=)
 * @returns The lesson to display, or null if no lessons available
 */
export function determineCurrentLesson(
  lessons: LessonResponse[],
  progress: ProgressResponse,
  searchParams?: { lesson?: string }
): LessonResponse | null {
  // No lessons available
  if (!lessons || lessons.length === 0) {
    return null;
  }

  // Priority 1: Check for lesson in query params
  if (searchParams?.lesson) {
    const lessonFromQuery = lessons.find(
      (l) => l.lessonId === searchParams.lesson
    );
    if (lessonFromQuery) {
      return lessonFromQuery;
    }
  }

  // Priority 2: Last accessed lesson (if not completed)
  if (progress.lastAccessedLesson) {
    const isLastAccessedCompleted = progress.completedLessons.includes(
      progress.lastAccessedLesson
    );
    if (!isLastAccessedCompleted) {
      const lastAccessedLesson = lessons.find(
        (l) => l.lessonId === progress.lastAccessedLesson
      );
      if (lastAccessedLesson) {
        return lastAccessedLesson;
      }
    }
  }

  // Priority 3: First uncompleted lesson
  const firstUncompletedLesson = lessons
    .sort((a, b) => a.order - b.order)
    .find((l) => !progress.completedLessons.includes(l.lessonId));

  if (firstUncompletedLesson) {
    return firstUncompletedLesson;
  }

  // Priority 4: Fallback to first lesson (all completed or no progress)
  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
  return sortedLessons[0];
}

/**
 * Gets the next lesson in sequence based on the current lesson's order
 *
 * @param lessons - Array of all lessons in the course
 * @param currentLessonId - ID of the current lesson
 * @returns The next lesson, or null if current is last lesson
 */
export function getNextLesson(
  lessons: LessonResponse[],
  currentLessonId: string
): LessonResponse | null {
  if (!lessons || lessons.length === 0) {
    return null;
  }

  const currentLesson = lessons.find((l) => l.lessonId === currentLessonId);
  if (!currentLesson) {
    return null;
  }

  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
  const currentIndex = sortedLessons.findIndex(
    (l) => l.lessonId === currentLessonId
  );

  // Return next lesson if exists
  if (currentIndex >= 0 && currentIndex < sortedLessons.length - 1) {
    return sortedLessons[currentIndex + 1];
  }

  return null;
}
