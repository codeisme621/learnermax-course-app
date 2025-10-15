'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { BookOpen, Clock, Award, Loader2, AlertCircle } from 'lucide-react';
import type { Course } from '@/app/actions/courses';
import type { Enrollment } from '@/app/actions/enrollments';

interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment; // Present if user is enrolled
  onEnroll?: (courseId: string) => Promise<void>; // Callback for enrollment action
}

export function CourseCard({ course, enrollment, onEnroll }: CourseCardProps) {
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

  const handleContinueCourse = () => {
    router.push(`/course/${course.courseId}`);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Course Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-accent/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen className="w-12 h-12 text-primary/40" />
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
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 line-clamp-2">
          {course.name}
        </h3>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {course.description}
        </p>

        {/* Course Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
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
            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{enrollment.progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{ width: `${enrollment.progress}%` }}
                />
              </div>
            </div>

            {/* Enrollment Date */}
            <p className="text-xs text-muted-foreground">
              Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
            </p>

            {/* Continue Button */}
            <Button
              onClick={handleContinueCourse}
              className="w-full"
              size="lg"
            >
              Continue Course
            </Button>
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

            {/* Enroll Button */}
            <Button
              onClick={handleEnrollClick}
              disabled={isEnrolling || !onEnroll}
              className="w-full"
              size="lg"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enrolling...
                </>
              ) : (
                'Enroll Now'
              )}
            </Button>

            {/* Retry Button (if error) */}
            {error && (
              <Button
                onClick={handleEnrollClick}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isEnrolling}
              >
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
