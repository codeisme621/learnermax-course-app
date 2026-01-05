'use client';

import useSWR from 'swr';
import { fetchVideoUrl } from '@/lib/fetchers';

interface VideoUrlData {
  videoUrl: string;
  expiresAt: number;
}

interface UseVideoUrlReturn {
  videoUrl: string | null;
  expiresAt: Date | null;
  isLoading: boolean;
  error: Error | null;
  refreshUrl: () => Promise<VideoUrlData | null | undefined>;
}

/**
 * SWR hook for fetching video URLs with automatic refresh
 *
 * Features:
 * - Auto-refreshes every 5 minutes (video URLs expire after 30 min)
 * - Deduplicates requests within 1 minute
 * - Revalidates on window focus
 * - Provides manual refresh capability
 *
 * @param lessonId - The lesson ID to fetch video URL for
 * @returns Video URL data with loading/error states
 */
export function useVideoUrl(lessonId: string | null): UseVideoUrlReturn {
  const { data, error, isLoading, mutate } = useSWR<VideoUrlData | null>(
    lessonId ? `video-url-${lessonId}` : null,
    () => fetchVideoUrl(lessonId!),
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes - refresh before URL expires
      revalidateOnFocus: true,
      dedupingInterval: 60 * 1000, // 1 minute - prevent duplicate requests
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000, // 5 seconds between retries
    }
  );

  return {
    videoUrl: data?.videoUrl ?? null,
    expiresAt: data?.expiresAt ? new Date(data.expiresAt * 1000) : null,
    isLoading,
    error: error ?? null,
    refreshUrl: mutate,
  };
}
