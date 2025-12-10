import { progressRepository } from './progress.repository.js';
import { lessonService } from '../lessons/lesson.service.js';
import type { ProgressResponse } from './progress.types.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('ProgressService');

/**
 * Progress service - Business logic layer
 * Handles progress tracking, percentage calculation, and lesson completion
 */
export class ProgressService {
  /**
   * Get student's progress for a specific course
   * Returns default empty progress if student hasn't started the course
   */
  async getProgress(studentId: string, courseId: string): Promise<ProgressResponse> {
    logger.info('[getProgress] Fetching progress', { studentId, courseId });

    const progress = await progressRepository.getProgress(studentId, courseId);

    if (!progress) {
      logger.info('[getProgress] No progress found, returning default empty state', {
        studentId,
        courseId,
      });

      // Return default empty progress
      const totalLessons = await lessonService.getTotalLessons(courseId);
      return {
        courseId,
        completedLessons: [],
        percentage: 0,
        totalLessons,
        updatedAt: new Date().toISOString(),
      };
    }

    logger.info('[getProgress] Progress retrieved', {
      studentId,
      courseId,
      completedCount: progress.completedLessons.length,
      percentage: progress.percentage,
    });

    return progress;
  }

  /**
   * Mark a lesson as complete for a student
   * - Deduplicates completedLessons using Set
   * - Recalculates percentage based on total lessons
   * - Updates lastAccessedLesson
   * - Saves to DynamoDB and returns updated progress
   */
  async markLessonComplete(
    studentId: string,
    courseId: string,
    lessonId: string
  ): Promise<ProgressResponse> {
    logger.info('[markLessonComplete] Marking lesson as complete', {
      studentId,
      courseId,
      lessonId,
    });

    // Get existing progress or create empty
    const existing = await progressRepository.getProgress(studentId, courseId);
    const existingCompletedLessons = existing?.completedLessons || [];

    logger.info('[markLessonComplete] Existing progress retrieved', {
      studentId,
      courseId,
      lessonId,
      existingCompletedCount: existingCompletedLessons.length,
    });

    // Deduplicate completed lessons using Set
    const completedSet = new Set(existingCompletedLessons);
    completedSet.add(lessonId);
    const completedLessons = Array.from(completedSet);

    // Get total lessons and calculate percentage
    const totalLessons = await lessonService.getTotalLessons(courseId);
    const percentage = Math.round((completedLessons.length / totalLessons) * 100);

    logger.info('[markLessonComplete] Calculated progress', {
      studentId,
      courseId,
      lessonId,
      completedCount: completedLessons.length,
      totalLessons,
      percentage,
    });

    // Save updated progress
    const updated = await progressRepository.saveProgress(studentId, courseId, {
      completedLessons,
      lastAccessedLesson: lessonId,
      percentage,
      totalLessons,
    });

    logger.info('[markLessonComplete] Progress updated successfully', {
      studentId,
      courseId,
      lessonId,
      completedCount: updated.completedLessons.length,
      percentage: updated.percentage,
    });

    return updated;
  }

  /**
   * Track lesson access (lightweight update when user clicks/opens a lesson)
   * Only updates lastAccessedLesson, does not affect completedLessons or percentage
   */
  async trackLessonAccess(studentId: string, courseId: string, lessonId: string): Promise<void> {
    logger.info('[trackLessonAccess] Tracking lesson access', {
      studentId,
      courseId,
      lessonId,
    });

    await progressRepository.updateLastAccessedLesson(studentId, courseId, lessonId);

    logger.info('[trackLessonAccess] Lesson access tracked', {
      studentId,
      courseId,
      lessonId,
    });
  }
}

// Singleton instance
export const progressService = new ProgressService();
