import { Lesson } from '../lessons/lesson.types.js';

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

  // NEW FIELDS - Added in Phase 3 Slice 3.1 (Premium Course Placeholder)
  comingSoon?: boolean;           // Indicates unreleased course (default: undefined/false)
  estimatedDuration?: string;     // e.g., "6-8 hours" - used for display
  totalLessons?: number | null;   // null if not defined yet, number when set
}
