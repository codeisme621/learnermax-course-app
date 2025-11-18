import { determineCurrentLesson, getNextLesson } from '../course-utils';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

describe('course-utils', () => {
  const mockLessons: LessonResponse[] = [
    {
      lessonId: 'lesson-1',
      courseId: 'test-course',
      title: 'Introduction',
      order: 1,
      lengthInMins: 15,
    },
    {
      lessonId: 'lesson-2',
      courseId: 'test-course',
      title: 'Getting Started',
      order: 2,
      lengthInMins: 20,
    },
    {
      lessonId: 'lesson-3',
      courseId: 'test-course',
      title: 'Advanced Topics',
      order: 3,
      lengthInMins: 30,
    },
  ];

  const mockProgressNoCompletion: ProgressResponse = {
    courseId: 'test-course',
    completedLessons: [],
    percentage: 0,
    totalLessons: 3,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  const mockProgressWithCompletion: ProgressResponse = {
    courseId: 'test-course',
    completedLessons: ['lesson-1'],
    lastAccessedLesson: 'lesson-2',
    percentage: 33,
    totalLessons: 3,
    updatedAt: '2025-01-15T10:30:00Z',
  };

  describe('determineCurrentLesson', () => {
    it('should return null if lessons array is empty', () => {
      const result = determineCurrentLesson([], mockProgressNoCompletion);
      expect(result).toBeNull();
    });

    it('should return lesson from query params if provided and valid', () => {
      const result = determineCurrentLesson(
        mockLessons,
        mockProgressNoCompletion,
        { lesson: 'lesson-3' }
      );
      expect(result?.lessonId).toBe('lesson-3');
    });

    it('should ignore invalid lesson in query params and fall back to other priorities', () => {
      const result = determineCurrentLesson(
        mockLessons,
        mockProgressNoCompletion,
        { lesson: 'invalid-lesson-id' }
      );
      // Should fall back to first lesson since no progress
      expect(result?.lessonId).toBe('lesson-1');
    });

    it('should return lastAccessedLesson if not completed', () => {
      const result = determineCurrentLesson(
        mockLessons,
        mockProgressWithCompletion
      );
      // lesson-2 is lastAccessed and not completed
      expect(result?.lessonId).toBe('lesson-2');
    });

    it('should NOT return lastAccessedLesson if it is completed', () => {
      const progressWithCompletedLast: ProgressResponse = {
        ...mockProgressWithCompletion,
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
      };

      const result = determineCurrentLesson(mockLessons, progressWithCompletedLast);
      // Should return first uncompleted (lesson-3)
      expect(result?.lessonId).toBe('lesson-3');
    });

    it('should return first uncompleted lesson when no lastAccessedLesson', () => {
      const progressSomeCompleted: ProgressResponse = {
        courseId: 'test-course',
        completedLessons: ['lesson-1'],
        percentage: 33,
        totalLessons: 3,
        updatedAt: '2025-01-15T10:30:00Z',
      };

      const result = determineCurrentLesson(mockLessons, progressSomeCompleted);
      expect(result?.lessonId).toBe('lesson-2');
    });

    it('should return first lesson when all lessons completed', () => {
      const progressAllCompleted: ProgressResponse = {
        courseId: 'test-course',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        percentage: 100,
        totalLessons: 3,
        updatedAt: '2025-01-15T10:30:00Z',
      };

      const result = determineCurrentLesson(mockLessons, progressAllCompleted);
      expect(result?.lessonId).toBe('lesson-1');
    });

    it('should return first lesson when no progress at all', () => {
      const result = determineCurrentLesson(mockLessons, mockProgressNoCompletion);
      expect(result?.lessonId).toBe('lesson-1');
    });

    it('should handle lessons with non-sequential order numbers', () => {
      const unorderedLessons: LessonResponse[] = [
        { ...mockLessons[0], order: 10 },
        { ...mockLessons[1], order: 5 },
        { ...mockLessons[2], order: 15 },
      ];

      const result = determineCurrentLesson(unorderedLessons, mockProgressNoCompletion);
      // Should return the lesson with order 5 (lesson-2)
      expect(result?.lessonId).toBe('lesson-2');
    });

    it('should prioritize query param over lastAccessedLesson', () => {
      const result = determineCurrentLesson(
        mockLessons,
        mockProgressWithCompletion,
        { lesson: 'lesson-3' }
      );
      // Query param (lesson-3) should override lastAccessedLesson (lesson-2)
      expect(result?.lessonId).toBe('lesson-3');
    });

    it('should handle missing lastAccessedLesson in progress', () => {
      const progressNoLast: ProgressResponse = {
        ...mockProgressWithCompletion,
        lastAccessedLesson: undefined,
      };

      const result = determineCurrentLesson(mockLessons, progressNoLast);
      // Should return first uncompleted (lesson-2)
      expect(result?.lessonId).toBe('lesson-2');
    });
  });

  describe('getNextLesson', () => {
    it('should return null if lessons array is empty', () => {
      const result = getNextLesson([], 'lesson-1');
      expect(result).toBeNull();
    });

    it('should return null if current lesson not found', () => {
      const result = getNextLesson(mockLessons, 'invalid-lesson-id');
      expect(result).toBeNull();
    });

    it('should return next lesson in sequence', () => {
      const result = getNextLesson(mockLessons, 'lesson-1');
      expect(result?.lessonId).toBe('lesson-2');
    });

    it('should return null if current lesson is the last one', () => {
      const result = getNextLesson(mockLessons, 'lesson-3');
      expect(result).toBeNull();
    });

    it('should handle lessons with non-sequential order numbers', () => {
      const unorderedLessons: LessonResponse[] = [
        { ...mockLessons[0], order: 10 },
        { ...mockLessons[1], order: 5 },
        { ...mockLessons[2], order: 15 },
      ];

      const result = getNextLesson(unorderedLessons, 'lesson-2');
      // lesson-2 has order 5, next should be lesson-1 (order 10)
      expect(result?.lessonId).toBe('lesson-1');
    });

    it('should return correct next lesson for middle lesson', () => {
      const result = getNextLesson(mockLessons, 'lesson-2');
      expect(result?.lessonId).toBe('lesson-3');
    });
  });
});
