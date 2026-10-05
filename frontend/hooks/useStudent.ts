'use client';

import useSWR from 'swr';
import { fetchStudent } from '@/lib/fetchers';
import { signUpForEarlyAccess } from '@/app/actions/students';

export interface StudentData {
  studentId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  interestedInPremium?: boolean;
  premiumInterestDate?: string;
}

/**
 * SWR hook for student data with optimistic updates
 *
 * Features:
 * - Fetches student profile from API
 * - Optimistic update for early access signup
 */
export function useStudent() {
  const { data, error, isLoading, mutate } = useSWR<StudentData | null>(
    'student',
    fetchStudent,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  /**
   * Sign up for early access (premium course interest)
   * Uses optimistic update for instant UI feedback
   */
  const setInterestedInPremium = async (courseId: string) => {
    if (!data) return;

    // Optimistic update
    await mutate(
      async () => {
        const result = await signUpForEarlyAccess(courseId);

        if (!result.success) {
          throw new Error(result.error || 'Failed to sign up');
        }

        // Return updated student data
        return {
          ...data,
          interestedInPremium: true,
          premiumInterestDate: new Date().toISOString(),
        };
      },
      {
        optimisticData: {
          ...data,
          interestedInPremium: true,
          premiumInterestDate: new Date().toISOString(),
        },
        rollbackOnError: true,
        revalidate: true,
      }
    );
  };

  return {
    student: data,
    isLoading,
    error,
    // Derived data
    interestedInPremium: data?.interestedInPremium ?? false,
    // Mutations
    setInterestedInPremium,
    // Revalidate
    mutate,
  };
}
