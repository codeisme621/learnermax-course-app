'use client';

import useSWR from 'swr';
import { fetchStudent } from '@/lib/fetchers';
import { signUpForEarlyAccess } from '@/app/actions/students';
import { signupForMeetup as signupForMeetupAction } from '@/app/actions/meetups';

export interface StudentData {
  studentId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  interestedInPremium?: boolean;
  premiumInterestDate?: string;
  signedUpMeetups?: string[];
}

/**
 * SWR hook for student data with optimistic updates
 *
 * Features:
 * - Fetches student profile from API
 * - Provides signedUpMeetups for meetup signup status
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

  /**
   * Sign up for a meetup
   * Uses optimistic update for instant UI feedback
   */
  const signupForMeetup = async (meetupId: string): Promise<{ error?: string }> => {
    if (!data) return { error: 'Not logged in' };

    // Check if already signed up
    if (data.signedUpMeetups?.includes(meetupId)) {
      return {}; // Already signed up, no-op
    }

    const newSignedUpMeetups = [...(data.signedUpMeetups ?? []), meetupId];

    try {
      // Optimistic update
      await mutate(
        async () => {
          const result = await signupForMeetupAction(meetupId);

          if (result && 'error' in result) {
            throw new Error(result.error);
          }

          // Return updated student data
          return {
            ...data,
            signedUpMeetups: newSignedUpMeetups,
          };
        },
        {
          optimisticData: {
            ...data,
            signedUpMeetups: newSignedUpMeetups,
          },
          rollbackOnError: true,
          revalidate: true,
        }
      );
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to sign up' };
    }
  };

  return {
    student: data,
    isLoading,
    error,
    // Derived data
    signedUpMeetups: data?.signedUpMeetups ?? [],
    interestedInPremium: data?.interestedInPremium ?? false,
    // Mutations
    setInterestedInPremium,
    signupForMeetup,
    // Revalidate
    mutate,
  };
}
