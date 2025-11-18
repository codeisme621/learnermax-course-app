'use server';
/**
 * Lesson - Domain model for a single video lesson within a course
 * This is the clean business domain type (no DynamoDB implementation details)
 */
export interface Lesson {
  lessonId: string;        // Unique identifier: "lesson-1", "lesson-2"
  title: string;           // Lesson title: "Introduction to Spec-Driven Development"
  lengthInMins: number;    // Duration in minutes: 15, 30, 45
  videoKey: string;        // S3 object key: "courses/spec-driven-dev-mini/lesson-1.mp4"
}

/**
 * LessonResponse - What the frontend receives from API endpoints
 * Used by GET /api/courses/:courseId/lessons
 *
 * Security: Does NOT include videoKey (internal S3 key)
 * Video URLs are generated on-demand via GET /api/lessons/:lessonId/video-url
 */
export interface LessonResponse {
  lessonId: string;        // "lesson-1"
  courseId: string;        // "spec-driven-dev-mini"
  title: string;           // "Introduction to Spec-Driven Development"
  description?: string;    // Optional detailed description for lesson page
  lengthInMins?: number;   // Optional: 15, 30, 45
  order: number;           // Display order in course: 1, 2, 3, 4, 5
  isCompleted?: boolean;   // Populated when fetching with student context (from Progress entity)
  // NOTE: videoKey intentionally excluded - internal only, never exposed to frontend
}

/**
 * VideoUrlResponse - Response from GET /api/lessons/:lessonId/video-url
 * Contains signed CloudFront URL with expiration timestamp
 */
export interface VideoUrlResponse {
  videoUrl: string;    // Signed CloudFront URL
  expiresAt: number;   // Unix timestamp (seconds) when URL expires
}

import { getAuthToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Get all lessons for a course
 * Protected endpoint - requires authentication
 *
 * @param courseId - The ID of the course
 * @returns Array of lessons or error
 */
export async function getLessons(
  courseId: string
): Promise<{ lessons: LessonResponse[]; totalLessons: number } | { error: string }> {
  console.log('[getLessons] Fetching lessons for course:', courseId);

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[getLessons] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/courses/${courseId}/lessons`;
    console.log('[getLessons] Fetching from:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh lesson data
    });

    console.log('[getLessons] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getLessons] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: endpoint,
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
    console.error('[getLessons] API_URL:', API_URL);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: 'Failed to connect to backend. Please check if backend is running.' };
    }
    return { error: 'Failed to fetch lessons' };
  }
}

/**
 * Get signed video URL for a lesson
 * Protected endpoint - requires authentication and enrollment
 *
 * @param lessonId - The ID of the lesson
 * @returns Signed CloudFront URL with expiration or error
 */
export async function getVideoUrl(
  lessonId: string
): Promise<VideoUrlResponse | { error: string }> {
  console.log('[getVideoUrl] Fetching video URL for lesson:', lessonId);

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[getVideoUrl] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/lessons/${lessonId}/video-url`;
    console.log('[getVideoUrl] Fetching from:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Never cache video URLs (they expire)
    });

    console.log('[getVideoUrl] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getVideoUrl] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: endpoint,
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
    console.log('[getVideoUrl] Successfully fetched video URL, expires at:', new Date(data.expiresAt * 1000).toISOString());
    return data;
  } catch (error) {
    console.error('[getVideoUrl] Exception occurred:', error);
    console.error('[getVideoUrl] API_URL:', API_URL);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: 'Failed to connect to backend. Please check if backend is running.' };
    }
    return { error: 'Failed to fetch video URL' };
  }
}
