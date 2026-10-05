/**
 * Landing page course data: the course from Postgres plus curated static content.
 */

import { getCourse } from '@/features/courses';
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

/**
 * Build landing page CourseData
 * Includes static content like instructor bio and testimonials
 */
export async function getCourseForLanding(courseId: string): Promise<CourseData> {
  const course = await getCourse(courseId);
  const topics = course.learningObjectives;

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
