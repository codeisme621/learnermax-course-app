'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the dashboard while SWR data loads
 */
export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="space-y-8 md:space-y-12">
        {/* Welcome Section Skeleton */}
        <div className="relative mb-8 md:mb-12 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/10">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>

        {/* Courses Section Skeleton */}
        <section>
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-7 w-32" />
          </div>

          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-32 md:h-36 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
