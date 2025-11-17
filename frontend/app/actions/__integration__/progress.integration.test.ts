/**
 * Integration tests for progress server actions with MSW
 * Tests the full network request/response cycle
 */
import { getProgress, markLessonComplete } from '../progress';
import * as auth from '../auth';

// Mock auth module
jest.mock('../auth', () => ({
  getAuthToken: jest.fn(),
}));

describe('Progress Integration Tests', () => {
  const mockToken = 'mock-jwt-token';
  const mockCourseId = 'spec-driven-dev-mini';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080';
    (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
  });

  describe('getProgress', () => {
    it('fetches student progress', async () => {
      const result = await getProgress(mockCourseId);

      if ('error' in result) {
        throw new Error('Expected progress, got error: ' + result.error);
      }

      expect(result).toMatchObject({
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1'],
        lastAccessedLesson: 'lesson-1',
        percentage: 33,
        totalLessons: 3,
      });
      expect(result.updatedAt).toBeDefined();
    });

    it('returns empty progress for new course', async () => {
      const result = await getProgress('new-course');

      if ('error' in result) {
        throw new Error('Expected progress, got error');
      }

      expect(result).toMatchObject({
        courseId: 'new-course',
        completedLessons: [],
        percentage: 0,
        totalLessons: 3,
      });
    });

    it('handles 404 course not found', async () => {
      const result = await getProgress('not-found');

      expect(result).toEqual({
        error: 'Course not found',
      });
    });

    it('handles 403 not enrolled', async () => {
      const result = await getProgress('not-enrolled');

      expect(result).toEqual({
        error: 'Not enrolled in this course',
      });
    });
  });

  describe('markLessonComplete', () => {
    it('marks lesson as complete and updates progress', async () => {
      const result = await markLessonComplete(mockCourseId, 'lesson-2');

      if ('error' in result) {
        throw new Error('Expected progress, got error: ' + result.error);
      }

      expect(result).toMatchObject({
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 67,
        totalLessons: 3,
      });
    });

    it('detects 100% course completion', async () => {
      const result = await markLessonComplete(mockCourseId, 'lesson-3');

      if ('error' in result) {
        throw new Error('Expected progress, got error');
      }

      expect(result.percentage).toBe(100);
      expect(result.completedLessons).toHaveLength(3);
      expect(result.completedLessons).toEqual([
        'lesson-1',
        'lesson-2',
        'lesson-3',
      ]);
    });

    it('handles 404 course/lesson not found', async () => {
      const result = await markLessonComplete('not-found', 'lesson-1');

      expect(result).toEqual({
        error: 'Course or lesson not found',
      });
    });

    it('handles 403 not enrolled', async () => {
      const result = await markLessonComplete('not-enrolled', 'lesson-1');

      expect(result).toEqual({
        error: 'Not enrolled in this course',
      });
    });
  });

  describe('Full progress flow', () => {
    it('completes course from 33% to 100%', async () => {
      // 1. Check initial progress (1 lesson complete = 33%)
      const initial = await getProgress(mockCourseId);
      if ('error' in initial) throw new Error('Expected progress');
      expect(initial.percentage).toBe(33);
      expect(initial.completedLessons).toHaveLength(1);

      // 2. Complete lesson 2 (67%)
      const progress2 = await markLessonComplete(mockCourseId, 'lesson-2');
      if ('error' in progress2) throw new Error('Expected progress');
      expect(progress2.percentage).toBe(67);
      expect(progress2.completedLessons).toHaveLength(2);

      // 3. Complete lesson 3 (100%)
      const progress3 = await markLessonComplete(mockCourseId, 'lesson-3');
      if ('error' in progress3) throw new Error('Expected progress');
      expect(progress3.percentage).toBe(100);
      expect(progress3.completedLessons).toHaveLength(3);
    });
  });
});
