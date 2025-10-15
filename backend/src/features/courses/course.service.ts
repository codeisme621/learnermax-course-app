import { courseRepository } from './course.repository.js';
import { createLogger } from '../../lib/logger.js';
import type { Course } from './course.types.js';

const logger = createLogger('CourseService');

export class CourseService {
  async getCourse(courseId: string): Promise<Course | undefined> {
    logger.info('[getCourse] Fetching course', { courseId });
    const course = await courseRepository.get(courseId);
    logger.info('[getCourse] Result', { courseId, found: !!course });
    return course;
  }

  async getAllCourses(): Promise<Course[]> {
    logger.info('[getAllCourses] Fetching all courses');
    const courses = await courseRepository.getAll();
    logger.info('[getAllCourses] Result', {
      count: courses.length,
      courseIds: courses.map(c => c.courseId)
    });
    return courses;
  }

  async createCourse(course: Course): Promise<void> {
    logger.info('[createCourse] Creating course', { courseId: course.courseId });
    await courseRepository.create(course);
    logger.info('[createCourse] Course created successfully', { courseId: course.courseId });
  }
}

export const courseService = new CourseService();
