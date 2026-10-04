'use client';

import { useEffect } from 'react';
import { Session } from 'next-auth';
import { Card } from '@/components/ui/card';
import { motion } from 'motion/react';
import { BookOpen, Loader2 } from 'lucide-react';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useProgress } from '@/hooks/useProgress';
import type { Course } from '@/lib/data/courses';
import { CourseCard } from './CourseCard';
import { PremiumCourseCard } from './PremiumCourseCard';

interface DashboardContentProps {
  session: Session;
  courses: Course[];
}

/**
 * Dashboard content with SWR for user-specific data
 * Courses are passed from SSR, user data fetched via SWR
 */
export function DashboardContent({ session, courses }: DashboardContentProps) {
  const { enroll, getEnrollment, isLoading: isLoadingEnrollments } = useEnrollments();

  // Check for pending enrollment on mount
  useEffect(() => {
    const pendingCourseId = sessionStorage.getItem('pendingEnrollmentCourseId');
    if (pendingCourseId) {
      console.log('Auto-enrolling in course:', pendingCourseId);
      enroll(pendingCourseId)
        .then(() => {
          console.log('Auto-enrollment successful');
        })
        .catch((err) => {
          console.error('Auto-enrollment failed:', err);
        })
        .finally(() => {
          sessionStorage.removeItem('pendingEnrollmentCourseId');
        });
    }
  }, [enroll]);

  // Handler for manual enrollment from course card
  const handleEnroll = async (courseId: string) => {
    await enroll(courseId);
  };

  const isLoading = isLoadingEnrollments;

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-8 md:space-y-12"
      >
        {/* Welcome Section */}
        <div className="relative mb-8 md:mb-12 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/10 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-gradient-to-br from-primary/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-tr from-accent/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />

          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, {session.user?.name?.split(' ')[0] || 'Student'}!
            </h1>
            <p className="text-muted-foreground">
              Ready to continue your learning journey?
            </p>
          </div>
        </div>

        {/* Courses Section */}
        <section>
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold">Your Courses</h2>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading courses...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && courses.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No courses available at the moment.</p>
              </div>
            </Card>
          )}

          {/* Course Cards Grid with Staggered Animation */}
          {!isLoading && courses.length > 0 && (
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
              {courses.map((course, index) => (
                <motion.div
                  key={course.courseId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                    ease: 'easeOut',
                  }}
                >
                  {course.comingSoon ? (
                    <PremiumCourseCard course={course} />
                  ) : (
                    <CourseCardWithProgress
                      course={course}
                      enrollment={getEnrollment(course.courseId)}
                      onEnroll={handleEnroll}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>

      </motion.div>
    </div>
  );
}

/**
 * CourseCard wrapper that fetches progress via SWR
 */
function CourseCardWithProgress({
  course,
  enrollment,
  onEnroll,
}: {
  course: Course;
  enrollment?: ReturnType<typeof useEnrollments>['enrollments'][number];
  onEnroll: (courseId: string) => Promise<void>;
}) {
  const { progress } = useProgress(enrollment ? course.courseId : '');

  return (
    <CourseCard
      course={course}
      enrollment={enrollment}
      progress={progress ?? undefined}
      onEnroll={onEnroll}
    />
  );
}
