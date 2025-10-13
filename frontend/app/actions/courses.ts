'use server';

/**
 * Server actions for course-related operations
 * These actions fetch course data from the backend API
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Course data types matching backend structure
export interface CourseVideo {
  videoId: string;
  title: string;
  lengthInMins: number;
  videoPath: string;
}

export interface CourseModule {
  moduleId: string;
  moduleName: string;
  videos: CourseVideo[];
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
}

/**
 * Get all available courses
 * This is a public endpoint - no authentication required
 *
 * @returns Array of courses or error
 */
export async function getAllCourses(): Promise<
  { courses: Course[] } | { error: string }
> {
  try {
    const response = await fetch(`${API_URL}/api/courses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh course data
    });

    if (!response.ok) {
      return { error: 'Failed to fetch courses' };
    }

    const courses: Course[] = await response.json();
    return { courses };
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { error: 'Failed to fetch courses' };
  }
}

/**
 * Get a single course by ID
 * This is a public endpoint - no authentication required
 *
 * @param courseId - The ID of the course to fetch
 * @returns Course data or error
 */
export async function getCourse(
  courseId: string
): Promise<{ course: Course } | { error: string }> {
  try {
    const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh course data
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Course not found' };
      }
      return { error: 'Failed to fetch course' };
    }

    const course: Course = await response.json();
    return { course };
  } catch (error) {
    console.error('Error fetching course:', error);
    return { error: 'Failed to fetch course' };
  }
}
