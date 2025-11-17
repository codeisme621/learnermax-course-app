import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

/**
 * Skeleton loading state for LessonListSidebar component
 * Displays while lessons and progress data are being fetched
 */
export function LessonListSkeleton() {
  return (
    <Card className="p-6">
      {/* Header skeleton */}
      <Skeleton className="h-6 w-32 mb-4" />

      {/* Lesson list skeletons (5 items) */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-3 w-16 ml-6" />
          </div>
        ))}
      </div>

      {/* Progress summary skeleton */}
      <div className="mt-6 pt-6 border-t">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-2 w-full mb-2" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </Card>
  );
}
