'use client';

import useSWR from 'swr';
import { fetchEnrollments } from '@/lib/fetchers';
import { enrollInCourse } from '@/app/actions/enrollments';

export interface EnrollmentData {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid';
  enrolledAt: string;
  paymentStatus: 'free' | 'pending' | 'completed' | 'failed';
  progress: number;
  completed: boolean;
}

/**
 * SWR hook for user enrollments with optimistic updates
 *
 * Features:
 * - Fetches all enrollments for current user
 * - Optimistic enrollment for instant UI feedback
 * - Helper methods for checking enrollment status
 */
export function useEnrollments() {
  const { data, error, isLoading, mutate } = useSWR<EnrollmentData[]>(
    'enrollments',
    fetchEnrollments,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
      fallbackData: [],
    }
  );

  const enrollments = data ?? [];

  /**
   * Enroll in a course with optimistic update
   */
  const enroll = async (courseId: string) => {
    // Create optimistic enrollment
    const optimisticEnrollment: EnrollmentData = {
      userId: '', // Will be filled by server
      courseId,
      enrollmentType: 'free',
      enrolledAt: new Date().toISOString(),
      paymentStatus: 'free',
      progress: 0,
      completed: false,
    };

    await mutate(
      async () => {
        const result = await enrollInCourse(courseId);

        if (!result.success) {
          throw new Error(result.error || 'Failed to enroll');
        }

        // Return updated enrollments with server data
        if (result.enrollment) {
          return [...enrollments, result.enrollment];
        }
        return [...enrollments, optimisticEnrollment];
      },
      {
        optimisticData: [...enrollments, optimisticEnrollment],
        rollbackOnError: true,
        revalidate: true,
      }
    );
  };

  /**
   * Check if user is enrolled in a specific course
   */
  const isEnrolled = (courseId: string): boolean => {
    return enrollments.some((e) => e.courseId === courseId);
  };

  /**
   * Get enrollment data for a specific course
   */
  const getEnrollment = (courseId: string): EnrollmentData | undefined => {
    return enrollments.find((e) => e.courseId === courseId);
  };

  return {
    enrollments,
    isLoading,
    error,
    // Mutations
    enroll,
    // Helpers
    isEnrolled,
    getEnrollment,
    // Revalidate
    mutate,
  };
}
