'use cache';

import { cacheLife, cacheTag } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Re-export types for convenience
export type { Course, CourseModule } from '@/types/courses';

import type { Course } from '@/types/courses';

/**
 * Get all available courses
 * Cached with 'max' profile - rarely changes, invalidate via script
 *
 * @param token - Auth token (passed as argument for cache key)
 * @returns Array of courses or error
 */
export async function getAllCourses(
  token: string
): Promise<{ courses: Course[] } | { error: string }> {
  'use cache';
  cacheLife('max');
  cacheTag('courses');

  console.log('[getAllCourses] Starting cached fetch');

  try {
    const endpoint = `${API_URL}/api/courses`;
    console.log('[getAllCourses] Fetching from:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[getAllCourses] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getAllCourses] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return { error: `Failed to fetch courses: ${response.statusText}` };
    }

    const courses: Course[] = await response.json();
    console.log('[getAllCourses] Successfully fetched', courses.length, 'courses');
    return { courses };
  } catch (error) {
    console.error('[getAllCourses] Exception occurred:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        error:
          'Failed to connect to backend. Please check if backend is running and NEXT_PUBLIC_API_URL is correct.',
      };
    }
    return { error: 'Failed to fetch courses' };
  }
}

/**
 * Get a single course by ID
 * Cached with 'max' profile - rarely changes, invalidate via script
 *
 * @param token - Auth token (passed as argument for cache key)
 * @param courseId - The ID of the course to fetch
 * @returns Course data or error
 */
export async function getCourse(
  token: string,
  courseId: string
): Promise<{ course: Course } | { error: string }> {
  'use cache';
  cacheLife('max');
  cacheTag(`course-${courseId}`);

  console.log('[getCourse] Fetching course with ID:', courseId);

  try {
    const endpoint = `${API_URL}/api/courses/${courseId}`;
    console.log('[getCourse] Fetching from:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('[getCourse] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getCourse] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      if (response.status === 404) {
        return { error: 'Course not found' };
      }
      return { error: 'Failed to fetch course' };
    }

    const course: Course = await response.json();
    console.log('[getCourse] Successfully fetched course:', course.courseId);
    return { course };
  } catch (error) {
    console.error('[getCourse] Exception occurred:', error);
    return { error: 'Failed to fetch course' };
  }
}
