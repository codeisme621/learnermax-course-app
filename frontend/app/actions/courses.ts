'use server';

import { getAuthToken } from './auth';

/**
 * Server actions for course-related operations
 * These actions fetch course data from the backend API
 */

import { Lesson } from './lessons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Course data types matching backend structure
export interface CourseModule {
  moduleId: string;
  moduleName: string;
  lessons: Lesson[];
}

export interface Course {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  pricingModel: 'free' | 'paid';
  price?: number;
  imageUrl: string;
  learningObjectives: string[];
  curriculum: CourseModule[];
  comingSoon?: boolean;
  estimatedDuration?: string;
  totalLessons?: number | null;
}

/**
 * Get all available courses
 * Protected endpoint - requires authentication
 *
 * @returns Array of courses or error
 */
export async function getAllCourses(): Promise<
  { courses: Course[] } | { error: string }
> {
  console.log('[getAllCourses] Starting fetch');

  try {
    // Get ID token for authentication
    const token = await getAuthToken();

    if (!token) {
      console.error('[getAllCourses] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/courses`;
    console.log('[getAllCourses] Fetching from:', endpoint);
    console.log('[getAllCourses] API_URL:', API_URL);
    console.log('[getAllCourses] ID token length:', token.length);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh course data
    });

    console.log('[getAllCourses] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getAllCourses] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: endpoint,
      });
      return { error: `Failed to fetch courses: ${response.statusText}` };
    }

    const courses: Course[] = await response.json();
    console.log('[getAllCourses] Successfully fetched', courses.length, 'courses');
    return { courses };
  } catch (error) {
    console.error('[getAllCourses] Exception occurred:', error);
    console.error('[getAllCourses] API_URL:', API_URL);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: 'Failed to connect to backend. Please check if backend is running and NEXT_PUBLIC_API_URL is correct.' };
    }
    return { error: 'Failed to fetch courses' };
  }
}

/**
 * Get a single course by ID
 * Protected endpoint - requires authentication
 *
 * @param courseId - The ID of the course to fetch
 * @returns Course data or error
 */
export async function getCourse(
  courseId: string
): Promise<{ course: Course } | { error: string }> {
  console.log('[getCourse] Fetching course with ID:', courseId);

  try {
    // Get ID token for authentication
    const token = await getAuthToken();

    if (!token) {
      console.error('[getCourse] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/courses/${courseId}`;
    console.log('[getCourse] Fetching from:', endpoint);
    console.log('[getCourse] ID token length:', token.length);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh course data
    });

    console.log('[getCourse] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getCourse] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: endpoint,
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
    console.error('[getCourse] API_URL:', API_URL);
    return { error: 'Failed to fetch course' };
  }
}
