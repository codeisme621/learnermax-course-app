'use cache';

import { cacheLife, cacheTag } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Re-export types for convenience
export type { Lesson, LessonResponse, VideoUrlResponse } from '@/types/lessons';

import type { LessonResponse, VideoUrlResponse } from '@/types/lessons';

/**
 * Get all lessons for a course
 * Cached with 'max' profile - rarely changes, invalidate via script
 *
 * @param token - Auth token (passed as argument for cache key)
 * @param courseId - The ID of the course
 * @returns Array of lessons or error
 */
export async function getLessons(
  token: string,
  courseId: string
): Promise<{ lessons: LessonResponse[]; totalLessons: number } | { error: string }> {
  'use cache';
  cacheLife('max');
  cacheTag(`lessons-${courseId}`);

  console.log('[getLessons] Fetching lessons for course:', courseId);

  try {
    const endpoint = `${API_URL}/api/courses/${courseId}/lessons`;
    console.log('[getLessons] Fetching from:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[getLessons] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getLessons] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      if (response.status === 404) {
        return { error: 'Course not found' };
      }
      if (response.status === 403) {
        return { error: 'Not enrolled in this course' };
      }
      return { error: `Failed to fetch lessons: ${response.statusText}` };
    }

    const data = await response.json();
    console.log('[getLessons] Successfully fetched', data.lessons?.length || 0, 'lessons');
    return data;
  } catch (error) {
    console.error('[getLessons] Exception occurred:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: 'Failed to connect to backend. Please check if backend is running.' };
    }
    return { error: 'Failed to fetch lessons' };
  }
}

/**
 * Get signed video URL for a lesson
 * NEVER CACHED - Signed URLs expire after 30 minutes
 *
 * @param token - Auth token
 * @param lessonId - The ID of the lesson
 * @returns Signed CloudFront URL with expiration or error
 */
export async function getVideoUrl(
  token: string,
  lessonId: string
): Promise<VideoUrlResponse | { error: string }> {
  // NO 'use cache' - video URLs must never be cached
  console.log('[getVideoUrl] Fetching video URL for lesson:', lessonId);

  try {
    const endpoint = `${API_URL}/api/lessons/${lessonId}/video-url`;
    console.log('[getVideoUrl] Fetching from:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store', // Never cache video URLs
    });

    console.log('[getVideoUrl] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getVideoUrl] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      if (response.status === 403) {
        return { error: 'Not enrolled in this course' };
      }
      if (response.status === 404) {
        return { error: 'Lesson not found' };
      }
      return { error: `Failed to fetch video URL: ${response.statusText}` };
    }

    const data: VideoUrlResponse = await response.json();
    console.log(
      '[getVideoUrl] Successfully fetched video URL, expires at:',
      new Date(data.expiresAt * 1000).toISOString()
    );
    return data;
  } catch (error) {
    console.error('[getVideoUrl] Exception occurred:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: 'Failed to connect to backend. Please check if backend is running.' };
    }
    return { error: 'Failed to fetch video URL' };
  }
}
