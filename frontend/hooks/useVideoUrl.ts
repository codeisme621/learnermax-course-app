'use client';

import useSWR, { useSWRConfig } from 'swr';
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

// Buffer time before expiry to trigger refresh (10 minutes in seconds)
const EXPIRY_BUFFER_SECONDS = 10 * 60;

/**
 * SWR hook for fetching video URLs with expiry-aware caching
 *
 * Features:
 * - Caches video URLs based on their expiry time (3 hours)
 * - Only refetches when URL is expired or about to expire (within 10 min)
 * - Prevents unnecessary API calls during lesson navigation
 * - Provides manual refresh capability
 *
 * @param courseId - The course ID (required for unique cache key)
 * @param lessonId - The lesson ID to fetch video URL for
 * @returns Video URL data with loading/error states
 */
export function useVideoUrl(courseId: string | null, lessonId: string | null): UseVideoUrlReturn {
  const { cache } = useSWRConfig();
  // Cache key includes courseId because lessonIds are not globally unique
  // (e.g., "intro" could exist in multiple courses)
  const cacheKey = courseId && lessonId ? `video-url-${courseId}-${lessonId}` : null;

  // Custom fetcher that checks expiry before making API call
  const smartFetcher = async (): Promise<VideoUrlData | null> => {
    // Check if we have valid cached data
    if (cacheKey) {
      const cachedEntry = cache.get(cacheKey);
      const cachedData = cachedEntry?.data as VideoUrlData | null | undefined;

      if (cachedData?.expiresAt) {
        const now = Math.floor(Date.now() / 1000);
        const timeToExpiry = cachedData.expiresAt - now;

        // If URL is still valid (with buffer), use cached data
        if (timeToExpiry > EXPIRY_BUFFER_SECONDS) {
          console.log('[useVideoUrl] Using cached URL, expires in', Math.round(timeToExpiry / 60), 'minutes');
          return cachedData;
        }
        console.log('[useVideoUrl] Cached URL expiring soon, refreshing');
      }
    }

    // Fetch new URL
    console.log('[useVideoUrl] Fetching new URL for:', lessonId);
    return fetchVideoUrl(lessonId!);
  };

  const { data, error, isLoading, mutate } = useSWR<VideoUrlData | null>(
    cacheKey,
    smartFetcher,
    {
      revalidateOnFocus: false, // Don't refetch on focus - URLs valid for 3 hours
      revalidateOnReconnect: false, // Don't refetch on reconnect
      dedupingInterval: 5 * 60 * 1000, // 5 minutes - prevent duplicate requests
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
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
