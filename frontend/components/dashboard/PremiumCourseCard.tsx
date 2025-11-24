'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle2 } from 'lucide-react';
import { signUpForEarlyAccess } from '@/app/actions/students';
import type { Course } from '@/app/actions/courses';

interface PremiumCourseCardProps {
  course: Course;
  isInterestedInPremium: boolean;
  isLoadingStudent: boolean;
}

export function PremiumCourseCard({
  course,
  isInterestedInPremium,
  isLoadingStudent,
}: PremiumCourseCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasSignedUp, setHasSignedUp] = useState(isInterestedInPremium);
  const [error, setError] = useState<string | null>(null);

  const handleEarlyAccessSignup = async () => {
    setIsLoading(true);
    setError(null);

    const result = await signUpForEarlyAccess(course.courseId);

    if (result.success) {
      setHasSignedUp(true);
      console.log('[PremiumCourseCard] Early access signup successful');
    } else {
      setError('Failed to sign up. Please try again.');
      console.error('[PremiumCourseCard] Early access signup failed', { error: result.error });
    }

    setIsLoading(false);
  };

  // Show loading skeleton while student profile is being fetched
  if (isLoadingStudent) {
    return (
      <Card className="overflow-hidden">
        {/* Image Skeleton */}
        <Skeleton className="h-32 md:h-40 w-full" />

        {/* Content Skeleton */}
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/50">
      {/* Course Image */}
      <div className="relative h-32 md:h-40 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30">
        {course.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.imageUrl}
            alt={course.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-yellow-600/40 dark:text-yellow-400/40 text-4xl font-bold">
              PREMIUM
            </div>
          </div>
        )}

        {/* Coming Soon Badge */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow-md">
            COMING SOON
          </Badge>
        </div>
      </div>

      {/* Course Content */}
      <div className="p-4 md:p-6">
        <div className="space-y-3 md:space-y-4">
          {/* Title */}
          <h3 className="text-lg md:text-xl font-bold text-foreground line-clamp-2">
            {course.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 md:line-clamp-3">
            {course.description}
          </p>

          {/* Course Meta - Stack on mobile, inline on desktop */}
          {course.estimatedDuration && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{course.estimatedDuration}</span>
              </div>
            </div>
          )}

          {/* Early Access CTA or Status */}
          <div className="pt-2">
            {hasSignedUp ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-500 text-sm font-medium p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>You&apos;re on the early access list</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={handleEarlyAccessSignup}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold transition-colors"
                  size="lg"
                >
                  {isLoading ? 'Signing up...' : 'Join Early Access'}
                </Button>

                {error && (
                  <p className="text-red-600 dark:text-red-400 text-sm text-center">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
