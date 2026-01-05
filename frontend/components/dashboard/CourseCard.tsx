'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock, Award, Loader2, AlertCircle, Play, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Course } from '@/types/courses';
import type { Enrollment } from '@/app/actions/enrollments';
import type { ProgressResponse } from '@/app/actions/progress';

interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment; // Present if user is enrolled
  progress?: ProgressResponse; // Live progress from Progress API
  onEnroll?: (courseId: string) => Promise<void>; // Callback for enrollment action
}

export function CourseCard({ course, enrollment, progress, onEnroll }: CourseCardProps) {
  const router = useRouter();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEnrolled = !!enrollment;

  const handleEnrollClick = async () => {
    if (!onEnroll) return;

    setError(null);
    setIsEnrolling(true);

    try {
      await onEnroll(course.courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleCardClick = () => {
    if (isEnrolled) {
      router.push(`/course/${course.courseId}`);
    } else if (onEnroll && !isEnrolling) {
      handleEnrollClick();
    }
  };

  // Card content with improved styling
  const cardContent = (
    <Card
      className={`overflow-hidden transition-all duration-300 group ${
        isEnrolled || onEnroll
          ? 'hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 cursor-pointer'
          : ''
      }`}
      onClick={!isEnrolled ? handleCardClick : undefined}
    >
      {/* Course Thumbnail - Enhanced gradient */}
      <div className="relative h-32 md:h-36 bg-gradient-to-br from-blue-500/20 via-primary/15 to-cyan-500/20 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/20 rounded-full blur-xl" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-cyan-500/20 rounded-full blur-lg" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-4 rounded-full bg-white/80 dark:bg-gray-900/80 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <BookOpen className="h-8 w-8 md:h-10 md:w-10 text-primary" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {isEnrolled ? (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600 shadow-md">
              ✓ Enrolled
            </Badge>
          ) : course.pricingModel === 'free' ? (
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-lg border-0">
              FREE
            </Badge>
          ) : (
            <Badge variant="secondary" className="shadow-md bg-white/90 dark:bg-gray-800/90">
              ${course.price}
            </Badge>
          )}
        </div>
      </div>

      {/* Card Content */}
      <CardContent className="pt-5">
        <div className="space-y-3">
          <div>
            <h3 className="text-lg md:text-xl font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {course.name}
            </h3>

            <p className="text-sm text-muted-foreground line-clamp-2">
              {course.description}
            </p>
          </div>

          {/* Course Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary/70" />
              <span>Self-paced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-primary/70" />
              <span>All Levels</span>
            </div>
          </div>

          {/* Enrolled State - Progress Section */}
          {isEnrolled && enrollment && progress && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Your Progress</span>
                <span className="font-semibold text-primary">
                  {progress.completedLessons.length}/{progress.totalLessons} lessons • {progress.percentage}%
                </span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>
          )}

          {/* Not Enrolled State */}
          {!isEnrolled && (
            <div className="space-y-3 pt-2">
              {/* Instructor */}
              {course.instructor && (
                <p className="text-sm text-muted-foreground">
                  By {course.instructor}
                </p>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Card Footer with CTA */}
      <CardFooter className="pt-0 pb-5">
        {isEnrolled ? (
          <Button
            className="w-full cursor-pointer group/btn"
            size="lg"
          >
            <Play className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
            Continue Learning
            <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        ) : (
          <Button
            className="w-full cursor-pointer"
            size="lg"
            variant={isEnrolling ? 'secondary' : 'default'}
            disabled={isEnrolling}
          >
            {isEnrolling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enrolling...
              </>
            ) : (
              <>
                Enroll Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  // Wrap enrolled courses in Link for proper navigation
  if (isEnrolled) {
    return (
      <Link href={`/course/${course.courseId}`} className="block active:scale-[0.98] active:opacity-90 transition-transform">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
