/**
 * Frontend Course types - mirrors backend Course types
 * Used for API responses and type safety
 */

export interface Lesson {
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  lengthInMins?: number;
  videoKey: string;
  order: number;
}

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
  // Optional fields for premium/coming soon courses
  comingSoon?: boolean;
  estimatedDuration?: string;
  totalLessons?: number | null;
}
