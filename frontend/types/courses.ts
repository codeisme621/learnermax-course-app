/**
 * Course-related type definitions
 * Shared across the application
 */

/**
 * Lesson - Domain model for a single video lesson within a course module
 * Used within CourseModule for curriculum display
 */
export interface Lesson {
  lessonId: string;        // Unique identifier: "lesson-1", "lesson-2"
  title: string;           // Lesson title: "Introduction to Spec-Driven Development"
  lengthInMins: number;    // Duration in minutes: 15, 30, 45
  videoKey: string;        // S3 object key: "courses/spec-driven-dev-mini/lesson-1.mp4"
}

/**
 * CourseModule - A grouping of lessons within a course curriculum
 */
export interface CourseModule {
  moduleId: string;
  moduleName: string;
  lessons: Lesson[];
}

/**
 * Course - Full course data including metadata and curriculum
 */
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
