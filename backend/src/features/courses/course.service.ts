import { courseRepository } from './course.repository.js';
import { createLogger } from '../../lib/logger.js';
import type { Course } from './course.types.js';

const logger = createLogger('CourseService');

export class CourseService {
  async getCourse(courseId: string): Promise<Course | undefined> {
    return await courseRepository.get(courseId);
  }

  async getAllCourses(): Promise<Course[]> {
    return await courseRepository.getAll();
  }

  async createCourse(course: Course): Promise<void> {
    await courseRepository.create(course);
    logger.info('Course created', { courseId: course.courseId });
  }
}

export const courseService = new CourseService();
