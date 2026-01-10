import { lessonRepository } from './lesson.repository.js';
import { createLogger } from '../../lib/logger.js';
import type { Lesson, LessonResponse } from './lesson.types.js';

const logger = createLogger('LessonService');

/**
 * Lesson Service - Business logic layer for lesson operations
 */
export class LessonService {
  /**
   * Get all lessons for a course, transformed to API response format
   * @param courseId - The course ID
   * @returns Array of lesson responses (excludes videoKey for security)
   */
  async getLessonsByCourse(courseId: string): Promise<LessonResponse[]> {
    logger.info('[getLessonsByCourse] Fetching lessons for course', {
      courseId,
    });

    const lessons = await lessonRepository.getLessonsByCourse(courseId);

    logger.info('[getLessonsByCourse] Lessons retrieved', {
      courseId,
      count: lessons.length,
    });

    // Transform to LessonResponse (exclude videoKey for security)
    return lessons.map((lesson) => ({
      lessonId: lesson.lessonId,
      courseId: lesson.courseId,
      title: lesson.title,
      description: lesson.description,
      lengthInMins: lesson.lengthInMins,
      order: lesson.order,
      hlsManifestKey: lesson.hlsManifestKey, // Include for HLS playback (when available)
      // videoKey intentionally excluded - only used internally for signed URL generation
    }));
  }

  /**
   * Get a specific lesson by ID
   * Returns full lesson data including videoKey (for internal use, e.g., signed URL generation)
   * @param lessonId - The lesson ID
   * @returns Lesson with videoKey (internal use only)
   */
  async getLesson(lessonId: string): Promise<Lesson | undefined> {
    logger.info('[getLesson] Fetching lesson', { lessonId });

    const lesson = await lessonRepository.getLesson(lessonId);

    if (!lesson) {
      logger.warn('[getLesson] Lesson not found', { lessonId });
      return undefined;
    }

    logger.info('[getLesson] Lesson retrieved', { lessonId });
    return lesson;
  }

  /**
   * Get total count of lessons for a course
   * Used for progress percentage calculation
   * @param courseId - The course ID
   * @returns Count of lessons
   */
  async getTotalLessons(courseId: string): Promise<number> {
    logger.info('[getTotalLessons] Getting total lessons', { courseId });

    const total = await lessonRepository.getTotalLessons(courseId);

    logger.info('[getTotalLessons] Total lessons retrieved', {
      courseId,
      total,
    });

    return total;
  }
}

// Singleton instance
export const lessonService = new LessonService();
