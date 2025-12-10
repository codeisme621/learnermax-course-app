'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { BookOpen, Loader2, AlertCircle, Users } from 'lucide-react';
import { enrollInCourse, getUserEnrollments, type Enrollment } from '@/app/actions/enrollments';
import { getAllCourses, type Course } from '@/app/actions/courses';
import { getProgress, type ProgressResponse } from '@/app/actions/progress';
import { getMeetups, type MeetupResponse } from '@/app/actions/meetups';
import { getStudent, type Student } from '@/app/actions/students';
import { CourseCard } from './CourseCard';
import { PremiumCourseCard } from './PremiumCourseCard';
import { MeetupCard } from './MeetupCard';

interface DashboardContentProps {
  session: Session;
}

export function DashboardContent({ session }: DashboardContentProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, ProgressResponse>>(new Map());
  const [meetups, setMeetups] = useState<MeetupResponse[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudent, setIsLoadingStudent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create enrollment lookup map for O(1) checks
  const enrollmentMap = new Map<string, Enrollment>();
  enrollments.forEach((enrollment) => {
    enrollmentMap.set(enrollment.courseId, enrollment);
  });

  useEffect(() => {
    async function initializeDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Check for pending enrollment in sessionStorage
        const pendingCourseId = sessionStorage.getItem('pendingEnrollmentCourseId');

        if (pendingCourseId) {
          console.log('Auto-enrolling in course:', pendingCourseId);
          const enrollResult = await enrollInCourse(pendingCourseId);

          if (enrollResult.success) {
            console.log('Auto-enrollment successful:', enrollResult);
          } else {
            console.error('Auto-enrollment failed:', enrollResult.error);
          }

          // Always clear sessionStorage after attempt (success or failure)
          sessionStorage.removeItem('pendingEnrollmentCourseId');
        }

        // Step 2: Fetch all dashboard data in parallel
        console.log('[DashboardContent] Fetching student profile');
        const [coursesResult, enrollmentsResult, meetupsResult, studentResult] = await Promise.all([
          getAllCourses(),
          getUserEnrollments(),
          getMeetups(),
          getStudent(),
        ]);

        // Handle student profile
        if (studentResult) {
          setStudent(studentResult);
          console.log('[DashboardContent] Student profile loaded', {
            interestedInPremium: studentResult.interestedInPremium,
          });
        } else {
          console.warn('[DashboardContent] Failed to fetch student profile');
        }
        setIsLoadingStudent(false);

        // Handle courses
        if ('courses' in coursesResult) {
          setCourses(coursesResult.courses);
        } else {
          setError('Failed to load courses');
        }

        // Handle enrollments
        if (enrollmentsResult) {
          setEnrollments(enrollmentsResult);

          // Step 4: Fetch progress for each enrolled course in parallel
          console.log('Fetching progress for enrolled courses:', enrollmentsResult.length);
          const progressPromises = enrollmentsResult.map((enrollment) =>
            getProgress(enrollment.courseId).then((result) => [enrollment.courseId, result] as const)
          );

          const progressEntries = await Promise.all(progressPromises);

          // Filter out errors and create Map
          const validProgressEntries = progressEntries.filter(
            ([courseId, result]) => {
              if ('error' in result) {
                console.warn('Failed to fetch progress for course', { courseId, error: result.error });
                return false;
              }
              return true;
            }
          ) as [string, ProgressResponse][];

          const newProgressMap = new Map(validProgressEntries);
          setProgressMap(newProgressMap);

          console.log('Dashboard data loaded', {
            coursesCount: courses.length,
            enrollmentsCount: enrollmentsResult.length,
            progressFetchedCount: newProgressMap.size,
            progressFailedCount: enrollmentsResult.length - newProgressMap.size,
          });
        }

        // Handle meetups (non-critical - fail gracefully)
        if (Array.isArray(meetupsResult)) {
          setMeetups(meetupsResult);
          console.log('Meetups loaded successfully', { count: meetupsResult.length });
        } else if (meetupsResult && 'error' in meetupsResult) {
          console.error('Failed to load meetups (continuing anyway):', meetupsResult.error);
          // Don't set error state - meetups are non-critical
        }

      } catch (err) {
        console.error('Dashboard initialization error:', err);
        setError('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    }

    initializeDashboard();
  }, []); // Run once on mount

  // Handler for manual enrollment from course card
  const handleEnroll = async (courseId: string) => {
    const result = await enrollInCourse(courseId);

    if (result.success) {
      // Refresh enrollments to show updated state
      const updatedEnrollments = await getUserEnrollments();
      if (updatedEnrollments) {
        setEnrollments(updatedEnrollments);

        // Fetch progress for the newly enrolled course
        const progressResult = await getProgress(courseId);
        if (!('error' in progressResult)) {
          setProgressMap((prev) => new Map(prev).set(courseId, progressResult));
        }
      }
    } else {
      // Error will be shown in CourseCard component
      throw new Error(result.error || 'Failed to enroll');
    }
  };

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

          {/* Error State */}
          {error && !isLoading && (
            <Card className="p-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-6 h-6" />
                <div>
                  <h3 className="font-semibold">Error Loading Courses</h3>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && courses.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No courses available at the moment.</p>
              </div>
            </Card>
          )}

          {/* Course Cards Grid with Staggered Animation */}
          {!isLoading && !error && courses.length > 0 && (
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
                    <PremiumCourseCard
                      course={course}
                      isInterestedInPremium={student?.interestedInPremium || false}
                      isLoadingStudent={isLoadingStudent}
                    />
                  ) : (
                    <CourseCard
                      course={course}
                      enrollment={enrollmentMap.get(course.courseId)}
                      progress={progressMap.get(course.courseId)}
                      onEnroll={handleEnroll}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Section Divider */}
        {!isLoading && meetups.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        )}

        {/* Meetups Section */}
        {!isLoading && meetups.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold">Community Meetups</h2>
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50">
                New
              </Badge>
            </div>
            <p className="text-muted-foreground mb-4 md:mb-6">
              Join our weekly meetups to connect with fellow learners, ask questions, and dive deeper into topics.
            </p>

            <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
              {meetups.map((meetup, index) => (
                <motion.div
                  key={meetup.meetupId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.4 + index * 0.1,
                    ease: 'easeOut',
                  }}
                >
                  <MeetupCard meetup={meetup} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </motion.div>
    </div>
  );
}
