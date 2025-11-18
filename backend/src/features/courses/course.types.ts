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
}
