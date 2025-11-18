import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loading state for VideoPlayer and lesson content
 * Displays while lesson data and video URL are being fetched
 */
export function VideoPlayerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Lesson title skeleton */}
      <Skeleton className="h-8 w-64" />

      {/* Video player skeleton (16:9 aspect ratio) */}
      <Skeleton className="w-full aspect-video" />

      {/* Next Lesson button skeleton */}
      <Skeleton className="h-16 w-full" />

      {/* Lesson description skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
