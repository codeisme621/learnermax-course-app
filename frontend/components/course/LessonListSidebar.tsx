import { getAuthToken } from '@/app/actions/auth';
import { getLessons } from '@/lib/data/lessons';
import { LessonList } from './LessonList';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LessonListSidebarProps {
  courseId: string;
  isMobile?: boolean;
}

/**
 * LessonListSidebar - Server component wrapper that fetches lesson data
 * Progress is fetched via SWR hook in the LessonList client component
 */
export async function LessonListSidebar({
  courseId,
  isMobile = false,
}: LessonListSidebarProps) {
  // Get auth token for cached data fetch
  const token = await getAuthToken();
  if (!token) {
    return (
      <Card className={cn('p-6', isMobile && 'h-full')}>
        <p className="text-sm text-muted-foreground">Authentication required</p>
      </Card>
    );
  }

  // Fetch lessons (cached)
  const lessonsResult = await getLessons(token, courseId);

  // Handle errors gracefully
  if ('error' in lessonsResult) {
    console.error('[LessonListSidebar] Failed to fetch lessons:', lessonsResult.error);
    return (
      <Card className={cn('p-6', isMobile && 'h-full')}>
        <p className="text-sm text-muted-foreground">Failed to load lessons</p>
      </Card>
    );
  }

  return (
    <LessonList
      courseId={courseId}
      lessons={lessonsResult.lessons}
      isMobile={isMobile}
    />
  );
}
