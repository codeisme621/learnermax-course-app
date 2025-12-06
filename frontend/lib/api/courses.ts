/**
 * Course API client and transformation layer
 * Used for SSG build-time data fetching
 */

import type { Course } from '@/types/course';
import type { CourseData } from '@/types/landing';
import {
  getInstructorProfile,
  getStaticTestimonials,
  getCourseStats,
  getStaticSubtitle,
  getStaticCategory,
  getStaticOutcomes,
  getStaticDuration,
  getStaticLevel,
} from '@/lib/static-content';
import { getApiBaseUrl } from '@/lib/env';

/**
 * Fetch course from backend API
 * Used at build time for SSG
 */
export async function fetchCourse(courseId: string): Promise<Course> {
  const API_BASE_URL = getApiBaseUrl();
  const url = `${API_BASE_URL}/api/courses/${courseId}`;

  console.log('[fetchCourse] Fetching course from:', url);

  const response = await fetch(url, {
    // Force cache for SSG - data fetched once at build time
    cache: 'force-cache',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch course: ${response.status} ${response.statusText}`);
  }

  const course: Course = await response.json();
  console.log('[fetchCourse] Successfully fetched course:', course.courseId);

  return course;
}

/**
 * Transform backend Course to landing page CourseData
 * Includes static content like instructor bio and testimonials
 */
export async function getCourseForLanding(courseId: string): Promise<CourseData> {
  // Fetch course from backend
  const course = await fetchCourse(courseId);

  // Extract lesson titles from curriculum
  const topics = course.curriculum.flatMap((module) =>
    module.lessons.map((lesson) => lesson.title)
  );

  // Get static content
  const instructorProfile = getInstructorProfile();
  const testimonials = getStaticTestimonials();
  const stats = getCourseStats();

  // Transform to landing page format
  return {
    id: course.courseId,
    title: course.name,
    subtitle: getStaticSubtitle(),
    description: course.description,
    duration: getStaticDuration(),
    level: getStaticLevel(),
    category: getStaticCategory(),
    instructor: {
      name: course.instructor,
      title: instructorProfile.title,
      background: instructorProfile.background,
      imageUrl: instructorProfile.imageUrl,
    },
    outcomes: getStaticOutcomes(),
    curriculum: [
      {
        module: 'Course Content',
        topics,
      },
    ],
    testimonials,
    stats,
  };
}
