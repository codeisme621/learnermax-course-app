'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'motion/react';
import { LogOut, User, Mail, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import { enrollInCourse, getUserEnrollments, type Enrollment } from '@/app/actions/enrollments';
import { getAllCourses, type Course } from '@/app/actions/courses';
import { CourseCard } from './CourseCard';

interface DashboardContentProps {
  session: Session;
}

export function DashboardContent({ session }: DashboardContentProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userInitials = session.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

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

        // Step 2: Fetch all courses
        const coursesResult = await getAllCourses();
        if ('courses' in coursesResult) {
          setCourses(coursesResult.courses);
        } else {
          setError('Failed to load courses');
        }

        // Step 3: Fetch user enrollments
        const enrollmentsResult = await getUserEnrollments();
        if (enrollmentsResult) {
          setEnrollments(enrollmentsResult);
        }
        // Note: enrollment fetch failure is not critical, just means empty enrollments

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
      >
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Welcome back, {session.user?.name?.split(' ')[0] || 'Student'}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* User Info Card */}
        <Card className="p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={session.user?.image || undefined} />
                <AvatarFallback className="text-lg font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {session.user?.name || 'Student'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {session.user?.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <User className="w-4 h-4" />
                  User ID: {session.user?.id}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={signOutAction}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Courses Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Available Courses</h2>
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

          {/* Course Cards Grid */}
          {!isLoading && !error && courses.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course.courseId}
                  course={course}
                  enrollment={enrollmentMap.get(course.courseId)}
                  onEnroll={handleEnroll}
                />
              ))}
            </div>
          )}
        </div>

        {/* Session Debug Info (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="p-6 mt-8 bg-muted/50">
            <h3 className="font-semibold mb-2 text-sm">
              Session Info (Development Only)
            </h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
