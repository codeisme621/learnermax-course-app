import { getLessons } from '@/app/actions/lessons';
import { getProgress } from '@/app/actions/progress';
import { LessonList } from './LessonList';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LessonListSidebarProps {
  courseId: string;
  isMobile?: boolean;
}

/**
 * LessonListSidebar - Server component wrapper that fetches lesson and progress data
 * Renders the LessonList client component with fetched data
 */
export async function LessonListSidebar({
  courseId,
  isMobile = false,
}: LessonListSidebarProps) {
  // Fetch lessons and progress in parallel
  const [lessonsResult, progressResult] = await Promise.all([
    getLessons(courseId),
    getProgress(courseId),
  ]);

  // Handle errors gracefully
  if ('error' in lessonsResult) {
    console.error('[LessonListSidebar] Failed to fetch lessons:', lessonsResult.error);
    return (
      <Card className={cn('p-6', isMobile && 'h-full')}>
        <p className="text-sm text-muted-foreground">Failed to load lessons</p>
      </Card>
    );
  }

  const lessons = lessonsResult.lessons;
  const progress = 'error' in progressResult
    ? {
        courseId,
        completedLessons: [],
        percentage: 0,
        totalLessons: lessons.length,
        updatedAt: new Date().toISOString()
      }
    : progressResult;

  return (
    <LessonList
      courseId={courseId}
      lessons={lessons}
      progress={progress}
      isMobile={isMobile}
    />
  );
}
