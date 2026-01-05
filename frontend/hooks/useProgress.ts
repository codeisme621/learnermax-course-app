'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { fetchProgress } from '@/lib/fetchers';
import { markLessonComplete, trackLessonAccess } from '@/app/actions/progress';

export interface ProgressData {
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;
  totalLessons: number;
  updatedAt: string;
}

/**
 * SWR hook for course progress with optimistic updates
 *
 * Features:
 * - Fetches progress for a specific course
 * - Optimistic update for marking lessons complete
 * - Fire-and-forget lesson access tracking
 * - Helper methods for progress status
 */
export function useProgress(courseId: string) {
  const { data, error, isLoading, mutate } = useSWR<ProgressData | null>(
    courseId ? `progress-${courseId}` : null,
    () => fetchProgress(courseId),
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  const progress = data;

  /**
   * Mark a lesson as complete
   * Simple approach: call server action, then revalidate SWR cache
   */
  const markComplete = useCallback(async (lessonId: string) => {
    // Skip if already completed (check local cache first to avoid unnecessary calls)
    if (data?.completedLessons.includes(lessonId)) {
      console.log('[useProgress] Lesson already completed, skipping:', lessonId);
      return;
    }

    console.log('[useProgress] Marking lesson complete:', lessonId);

    // Call server action directly
    const result = await markLessonComplete(courseId, lessonId);

    if ('error' in result) {
      console.error('[useProgress] Failed to mark complete:', result.error);
      throw new Error(result.error);
    }

    console.log('[useProgress] Server confirmed complete, revalidating cache');

    // Revalidate SWR cache to get fresh data
    await mutate();
  }, [courseId, data?.completedLessons, mutate]);

  /**
   * Track lesson access (fire-and-forget, updates lastAccessedLesson)
   * Does not block UI, just updates in background
   * Memoized to prevent unnecessary re-renders when used in useEffect dependencies
   */
  const trackAccess = useCallback(async (lessonId: string) => {
    // Fire-and-forget: call the server action directly
    // Don't do optimistic update here - it causes re-render loops
    trackLessonAccess(courseId, lessonId).catch((err) => {
      console.error('[useProgress] Failed to track access:', err);
    });
  }, [courseId]);

  /**
   * Check if a specific lesson is completed
   */
  const isLessonCompleted = (lessonId: string): boolean => {
    return progress?.completedLessons.includes(lessonId) ?? false;
  };

  return {
    progress,
    isLoading,
    error,
    // Derived data
    percentage: progress?.percentage ?? 0,
    completedCount: progress?.completedLessons.length ?? 0,
    totalLessons: progress?.totalLessons ?? 0,
    lastAccessedLesson: progress?.lastAccessedLesson,
    // Mutations
    markComplete,
    trackAccess,
    // Helpers
    isLessonCompleted,
    // Revalidate
    mutate,
  };
}
