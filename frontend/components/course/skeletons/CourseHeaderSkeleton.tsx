import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loading state for CourseHeader component
 * Displays while course and progress data is being fetched
 */
export function CourseHeaderSkeleton() {
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Back button skeleton */}
          <Skeleton className="h-8 w-32" />

          {/* Course name skeleton (center on mobile) */}
          <Skeleton className="h-8 w-48 flex-1 mx-4" />

          {/* Progress section (desktop only) */}
          <div className="hidden md:flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-2 w-32" />
            <Skeleton className="h-4 w-8" />
          </div>

          {/* Mobile: Hamburger menu skeleton */}
          <Skeleton className="lg:hidden h-6 w-6" />
        </div>
      </div>
    </header>
  );
}
