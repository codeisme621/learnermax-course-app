'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle2, Crown, Sparkles, Target, Zap, Star } from 'lucide-react';
import { useStudent } from '@/hooks/useStudent';
import type { Course } from '@/types/courses';

interface PremiumCourseCardProps {
  course: Course;
}

export function PremiumCourseCard({ course }: PremiumCourseCardProps) {
  const { interestedInPremium, setInterestedInPremium, isLoading: isLoadingStudent } = useStudent();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEarlyAccessSignup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await setInterestedInPremium(course.courseId);
      console.log('[PremiumCourseCard] Early access signup successful');
    } catch (err) {
      setError('Failed to sign up. Please try again.');
      console.error('[PremiumCourseCard] Early access signup failed', { error: err });
    } finally {
      setIsLoading(false);
    }
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

  // Premium course features (hardcoded for now, could be from course data)
  const premiumFeatures = [
    { icon: Target, text: 'Advanced patterns & architectures' },
    { icon: Zap, text: 'Real production scenarios' },
    { icon: Star, text: 'Lead AI-assisted engineering' },
  ];

  return (
    <Card className="overflow-hidden transition-all duration-300 group hover:shadow-xl hover:shadow-amber-500/10 border-amber-200/50 dark:border-amber-800/30 hover:border-amber-400/50">
      {/* Course Image - Premium golden gradient */}
      <div className="relative h-32 md:h-36 bg-gradient-to-br from-amber-400/30 via-yellow-300/20 to-orange-400/30 dark:from-amber-600/20 dark:via-yellow-500/15 dark:to-orange-500/20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-400/30 rounded-full blur-xl" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-400/30 rounded-full blur-lg" />

        {/* Always show the decorative Crown icon for premium courses */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-4 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/50 dark:to-yellow-900/50 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <Crown className="h-8 w-8 md:h-10 md:w-10 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg border-0">
            <Sparkles className="w-3 h-3 mr-1" />
            COMING SOON
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-lg border-0">
            <Crown className="w-3 h-3 mr-1" />
            PREMIUM
          </Badge>
        </div>
      </div>

      {/* Course Content */}
      <CardContent className="pt-5">
        <div className="space-y-3">
          {/* Title */}
          <h3 className="text-lg md:text-xl font-bold text-foreground line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {course.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>

          {/* Premium Features */}
          <div className="space-y-2 pt-2">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <feature.icon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-muted-foreground">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Course Meta */}
          {course.estimatedDuration && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
              <Clock className="w-4 h-4 text-amber-500/70" />
              <span>{course.estimatedDuration}</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Card Footer with Early Access CTA */}
      <CardFooter className="pt-0 pb-5">
        {interestedInPremium ? (
          <div className="w-full flex items-center justify-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800/50">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>You&apos;re on the early access list!</span>
          </div>
        ) : (
          <div className="w-full space-y-2">
            <Button
              onClick={handleEarlyAccessSignup}
              disabled={isLoading}
              className="w-full cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg hover:shadow-amber-500/25 transition-all duration-300"
              size="lg"
            >
              {isLoading ? (
                'Signing up...'
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Join Early Access
                </>
              )}
            </Button>

            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </p>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
