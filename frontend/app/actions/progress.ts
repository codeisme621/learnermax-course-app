'use server';
/**
 * ProgressResponse - API response for student's course progress
 * Returned when frontend requests progress for a specific course
 */
export interface ProgressResponse {
  courseId: string;           // "spec-driven-dev-mini"
  completedLessons: string[]; // ["lesson-1", "lesson-2", "lesson-3"]
  lastAccessedLesson?: string; // "lesson-3" (for "Resume" button)
  percentage: number;         // 60 (calculated: 3/5 * 100)
  totalLessons: number;       // 5 (total lessons in course, for UI progress bar)
  updatedAt: string;          // "2025-01-15T10:30:00Z" (last progress update)
}

import { getAuthToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Get student's progress for a course
 * Protected endpoint - requires authentication
 *
 * @param courseId - The ID of the course
 * @returns Progress data or error
 */
export async function getProgress(
  courseId: string
): Promise<ProgressResponse | { error: string }> {
  console.log('[getProgress] Fetching progress for course:', courseId);

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[getProgress] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/progress/${courseId}`;
    console.log('[getProgress] Fetching from:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh progress data
    });

    console.log('[getProgress] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getProgress] Backend returned error:', {
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
      return { error: `Failed to fetch progress: ${response.statusText}` };
    }

    const data: ProgressResponse = await response.json();
    console.log('[getProgress] Successfully fetched progress:', {
      percentage: data.percentage,
      completedLessons: data.completedLessons.length,
      totalLessons: data.totalLessons,
    });
    return data;
  } catch (error) {
    console.error('[getProgress] Exception occurred:', error);
    console.error('[getProgress] API_URL:', API_URL);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: 'Failed to connect to backend. Please check if backend is running.' };
    }
    return { error: 'Failed to fetch progress' };
  }
}

/**
 * Mark a lesson as complete
 * Protected endpoint - requires authentication
 *
 * @param courseId - The ID of the course
 * @param lessonId - The ID of the lesson to mark complete
 * @returns Updated progress data or error
 */
export async function markLessonComplete(
  courseId: string,
  lessonId: string
): Promise<ProgressResponse | { error: string }> {
  console.log('[markLessonComplete] Marking lesson complete:', { courseId, lessonId });

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[markLessonComplete] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/progress`;
    console.log('[markLessonComplete] Posting to:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId, lessonId }),
      cache: 'no-store',
    });

    console.log('[markLessonComplete] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[markLessonComplete] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: endpoint,
      });

      if (response.status === 404) {
        return { error: 'Course or lesson not found' };
      }
      if (response.status === 403) {
        return { error: 'Not enrolled in this course' };
      }
      return { error: `Failed to mark lesson complete: ${response.statusText}` };
    }

    const data: ProgressResponse = await response.json();
    console.log('[markLessonComplete] Successfully marked complete. New progress:', {
      percentage: data.percentage,
      completedLessons: data.completedLessons.length,
      totalLessons: data.totalLessons,
    });
    return data;
  } catch (error) {
    console.error('[markLessonComplete] Exception occurred:', error);
    console.error('[markLessonComplete] API_URL:', API_URL);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: 'Failed to connect to backend. Please check if backend is running.' };
    }
    return { error: 'Failed to mark lesson complete' };
  }
}
