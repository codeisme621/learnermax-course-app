'use client';

import useSWR from 'swr';
import { fetchEnrollments } from '@/lib/fetchers';
import type { EnrollmentDTO } from '@/features/enrollment';

/**
 * SWR hook for the signed-in user's active enrollments.
 * Enrollment only comes from a confirmed purchase, so there is no client-side enroll.
 */
export function useEnrollments() {
  const { data, error, isLoading, mutate } = useSWR<EnrollmentDTO[]>('enrollments', fetchEnrollments, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
    fallbackData: [],
  });

  const enrollments = data ?? [];

  return {
    enrollments,
    isLoading,
    error,
    isEnrolled: (courseId: string) => enrollments.some((e) => e.courseId === courseId),
    getEnrollment: (courseId: string) => enrollments.find((e) => e.courseId === courseId),
    mutate,
  };
}
