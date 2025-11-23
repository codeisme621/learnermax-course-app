'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock, Award, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { Course } from '@/app/actions/courses';
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

  // Enrolled courses: wrap in Link for better accessibility
  // Non-enrolled courses: use onClick handler
  const cardContent = (
    <Card
      className={`overflow-hidden transition-all duration-200 ${
        isEnrolled || onEnroll
          ? 'hover:shadow-lg hover:border-primary/50 hover:scale-[1.02] active:scale-[0.98] active:opacity-90 cursor-pointer focus:ring-2 focus:ring-primary focus:ring-offset-2'
          : ''
      }`}
      onClick={!isEnrolled ? handleCardClick : undefined}
    >
      {/* Course Thumbnail */}
      <div className="relative h-32 md:h-40 bg-gradient-to-br from-primary/20 to-accent/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen className="h-12 w-12 md:h-16 md:w-16 text-primary/40" />
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {isEnrolled ? (
            <Badge variant="default" className="bg-green-600">
              Enrolled
            </Badge>
          ) : (
            <Badge variant="secondary">
              {course.pricingModel === 'free' ? 'Free' : `$${course.price}`}
            </Badge>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 md:p-6">
        <div className="space-y-3 md:space-y-4">
          <div>
            <h3 className="text-lg md:text-xl font-bold mb-2 line-clamp-2">
              {course.name}
            </h3>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {course.description}
            </p>
          </div>

          {/* Course Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Self-paced</span>
            </div>
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4" />
              <span>All Levels</span>
            </div>
          </div>

          {/* Enrolled State */}
          {isEnrolled && enrollment && (
            <div className="space-y-3">
              {/* Live Progress (only show if progress data available) */}
              {progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {progress.completedLessons.length}/{progress.totalLessons} • {progress.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all duration-500"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Enrollment Date */}
              <p className="text-xs text-muted-foreground">
                Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Not Enrolled State */}
          {!isEnrolled && (
            <div className="space-y-3">
              {/* Instructor */}
              {course.instructor && (
                <p className="text-sm text-muted-foreground">
                  By {course.instructor}
                </p>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs">{error}</p>
                </div>
              )}

              {/* Loading State */}
              {isEnrolling && (
                <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enrolling...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
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
