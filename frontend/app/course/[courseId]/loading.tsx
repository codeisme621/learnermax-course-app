import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

/**
 * Loading skeleton for the course page
 * Shows while auth and data fetching completes
 */
export default function CoursePageLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24 hidden md:block" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex pt-16">
        {/* Sidebar Skeleton */}
        <aside className="hidden lg:block w-80 border-r bg-muted/30 h-[calc(100vh-4rem)] overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Course Title */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>

            {/* Lesson List */}
            <div className="space-y-2 pt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg"
                >
                  <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {/* Video Player Skeleton */}
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>

          {/* Lesson Info Skeleton */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>

          {/* Course Info Card Skeleton */}
          <Card className="p-4 md:p-6 space-y-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
