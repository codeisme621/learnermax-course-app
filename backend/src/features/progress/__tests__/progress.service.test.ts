import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import type { ProgressResponse } from '../progress.types.js';

// Mock logger BEFORE importing service
jest.unstable_mockModule('../../../lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock dependencies
const mockGetProgress = jest.fn<() => Promise<ProgressResponse | undefined>>();
const mockSaveProgress = jest.fn<() => Promise<ProgressResponse>>();
const mockUpdateLastAccessedLesson = jest.fn<() => Promise<void>>();
const mockGetTotalLessons = jest.fn<() => Promise<number>>();

jest.unstable_mockModule('../progress.repository', () => ({
  progressRepository: {
    getProgress: mockGetProgress,
    saveProgress: mockSaveProgress,
    updateLastAccessedLesson: mockUpdateLastAccessedLesson,
  },
}));

jest.unstable_mockModule('../../lessons/lesson.service', () => ({
  lessonService: {
    getTotalLessons: mockGetTotalLessons,
  },
}));

// Import after mocking
const { progressService } = await import('../progress.service.js');

describe('ProgressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProgress', () => {
    it('should return existing progress when available', async () => {
      const studentId = 'student-123';
      const courseId = 'spec-driven-dev-mini';

      const existingProgress: ProgressResponse = {
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 40,
        totalLessons: 5,
        updatedAt: '2025-01-15T10:30:00Z',
      };

      mockGetProgress.mockResolvedValue(existingProgress);

      const result = await progressService.getProgress(studentId, courseId);

      expect(result).toEqual(existingProgress);
      expect(mockGetProgress).toHaveBeenCalledWith(studentId, courseId);
      expect(mockGetTotalLessons).not.toHaveBeenCalled();
    });

    it('should return default empty progress when no progress exists', async () => {
      const studentId = 'student-456';
      const courseId = 'new-course';

      mockGetProgress.mockResolvedValue(undefined);
      mockGetTotalLessons.mockResolvedValue(10);

      const result = await progressService.getProgress(studentId, courseId);

      expect(result.courseId).toBe('new-course');
      expect(result.completedLessons).toEqual([]);
      expect(result.percentage).toBe(0);
      expect(result.totalLessons).toBe(10);
      expect(result.updatedAt).toBeDefined();
      expect(typeof result.updatedAt).toBe('string');

      expect(mockGetProgress).toHaveBeenCalledWith(studentId, courseId);
      expect(mockGetTotalLessons).toHaveBeenCalledWith(courseId);
    });

    it('should include lastAccessedLesson if present', async () => {
      const existingProgress: ProgressResponse = {
        courseId: 'course-123',
        completedLessons: ['lesson-1'],
        lastAccessedLesson: 'lesson-1',
        percentage: 20,
        totalLessons: 5,
        updatedAt: '2025-01-15T11:00:00Z',
      };

      mockGetProgress.mockResolvedValue(existingProgress);

      const result = await progressService.getProgress('student-789', 'course-123');

      expect(result.lastAccessedLesson).toBe('lesson-1');
    });
  });

  describe('markLessonComplete', () => {
    it('should mark first lesson as complete for new student', async () => {
      const studentId = 'student-new';
      const courseId = 'course-abc';
      const lessonId = 'lesson-1';

      mockGetProgress.mockResolvedValue(undefined); // No existing progress
      mockGetTotalLessons.mockResolvedValue(5);

      const savedProgress: ProgressResponse = {
        courseId: 'course-abc',
        completedLessons: ['lesson-1'],
        lastAccessedLesson: 'lesson-1',
        percentage: 20,
        totalLessons: 5,
        updatedAt: '2025-01-15T12:00:00Z',
      };

      mockSaveProgress.mockResolvedValue(savedProgress);

      const result = await progressService.markLessonComplete(studentId, courseId, lessonId);

      expect(result).toEqual(savedProgress);
      expect(mockGetProgress).toHaveBeenCalledWith(studentId, courseId);
      expect(mockGetTotalLessons).toHaveBeenCalledWith(courseId);
      expect(mockSaveProgress).toHaveBeenCalledWith(studentId, courseId, {
        completedLessons: ['lesson-1'],
        lastAccessedLesson: 'lesson-1',
        percentage: 20,
        totalLessons: 5,
      });
    });

    it('should add new lesson to existing completed lessons', async () => {
      const studentId = 'student-123';
      const courseId = 'course-xyz';
      const lessonId = 'lesson-3';

      const existingProgress: ProgressResponse = {
        courseId: 'course-xyz',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 40,
        totalLessons: 5,
        updatedAt: '2025-01-15T11:00:00Z',
      };

      mockGetProgress.mockResolvedValue(existingProgress);
      mockGetTotalLessons.mockResolvedValue(5);

      const savedProgress: ProgressResponse = {
        courseId: 'course-xyz',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        lastAccessedLesson: 'lesson-3',
        percentage: 60,
        totalLessons: 5,
        updatedAt: '2025-01-15T12:00:00Z',
      };

      mockSaveProgress.mockResolvedValue(savedProgress);

      const result = await progressService.markLessonComplete(studentId, courseId, lessonId);

      expect(result.completedLessons).toHaveLength(3);
      expect(result.percentage).toBe(60);
      expect(result.lastAccessedLesson).toBe('lesson-3');

      expect(mockSaveProgress).toHaveBeenCalledWith(studentId, courseId, {
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        lastAccessedLesson: 'lesson-3',
        percentage: 60,
        totalLessons: 5,
      });
    });

    it('should deduplicate completed lessons', async () => {
      const studentId = 'student-456';
      const courseId = 'course-123';
      const lessonId = 'lesson-2'; // Already completed

      const existingProgress: ProgressResponse = {
        courseId: 'course-123',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 40,
        totalLessons: 5,
        updatedAt: '2025-01-15T11:00:00Z',
      };

      mockGetProgress.mockResolvedValue(existingProgress);
      mockGetTotalLessons.mockResolvedValue(5);

      const savedProgress: ProgressResponse = {
        courseId: 'course-123',
        completedLessons: ['lesson-1', 'lesson-2'], // No duplicate
        lastAccessedLesson: 'lesson-2',
        percentage: 40,
        totalLessons: 5,
        updatedAt: '2025-01-15T12:00:00Z',
      };

      mockSaveProgress.mockResolvedValue(savedProgress);

      const result = await progressService.markLessonComplete(studentId, courseId, lessonId);

      expect(result.completedLessons).toHaveLength(2);
      expect(result.completedLessons).toEqual(['lesson-1', 'lesson-2']);

      // Verify Set deduplication was used
      const saveCall = mockSaveProgress.mock.calls[0];
      expect(saveCall[2].completedLessons).toHaveLength(2);
    });

    it('should calculate percentage correctly', async () => {
      const testCases = [
        {
          completedCount: 1,
          totalLessons: 5,
          expectedPercentage: 20,
        },
        {
          completedCount: 3,
          totalLessons: 5,
          expectedPercentage: 60,
        },
        {
          completedCount: 5,
          totalLessons: 5,
          expectedPercentage: 100,
        },
        {
          completedCount: 2,
          totalLessons: 3,
          expectedPercentage: 67, // Math.round(66.666...)
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const existingCompletedLessons = Array.from(
          { length: testCase.completedCount - 1 },
          (_, i) => `lesson-${i + 1}`
        );

        const existingProgress: ProgressResponse | undefined =
          existingCompletedLessons.length > 0
            ? {
                courseId: 'course-test',
                completedLessons: existingCompletedLessons,
                lastAccessedLesson: existingCompletedLessons[existingCompletedLessons.length - 1],
                percentage: 0,
                totalLessons: testCase.totalLessons,
                updatedAt: '2025-01-15T10:00:00Z',
              }
            : undefined;

        mockGetProgress.mockResolvedValue(existingProgress);
        mockGetTotalLessons.mockResolvedValue(testCase.totalLessons);
        mockSaveProgress.mockResolvedValue({
          courseId: 'course-test',
          completedLessons: Array.from(
            { length: testCase.completedCount },
            (_, i) => `lesson-${i + 1}`
          ),
          lastAccessedLesson: `lesson-${testCase.completedCount}`,
          percentage: testCase.expectedPercentage,
          totalLessons: testCase.totalLessons,
          updatedAt: '2025-01-15T12:00:00Z',
        });

        await progressService.markLessonComplete(
          'student-test',
          'course-test',
          `lesson-${testCase.completedCount}`
        );

        const saveCall = mockSaveProgress.mock.calls[0];
        expect(saveCall[2].percentage).toBe(testCase.expectedPercentage);
      }
    });

    it('should update lastAccessedLesson to current lesson', async () => {
      const existingProgress: ProgressResponse = {
        courseId: 'course-abc',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 40,
        totalLessons: 5,
        updatedAt: '2025-01-15T11:00:00Z',
      };

      mockGetProgress.mockResolvedValue(existingProgress);
      mockGetTotalLessons.mockResolvedValue(5);
      mockSaveProgress.mockResolvedValue({
        courseId: 'course-abc',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-4'],
        lastAccessedLesson: 'lesson-4',
        percentage: 60,
        totalLessons: 5,
        updatedAt: '2025-01-15T12:00:00Z',
      });

      await progressService.markLessonComplete('student-123', 'course-abc', 'lesson-4');

      const saveCall = mockSaveProgress.mock.calls[0];
      expect(saveCall[2].lastAccessedLesson).toBe('lesson-4');
    });

    it('should handle 100% completion', async () => {
      const existingProgress: ProgressResponse = {
        courseId: 'course-xyz',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4'],
        lastAccessedLesson: 'lesson-4',
        percentage: 80,
        totalLessons: 5,
        updatedAt: '2025-01-15T11:00:00Z',
      };

      mockGetProgress.mockResolvedValue(existingProgress);
      mockGetTotalLessons.mockResolvedValue(5);

      const savedProgress: ProgressResponse = {
        courseId: 'course-xyz',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4', 'lesson-5'],
        lastAccessedLesson: 'lesson-5',
        percentage: 100,
        totalLessons: 5,
        updatedAt: '2025-01-15T12:00:00Z',
      };

      mockSaveProgress.mockResolvedValue(savedProgress);

      const result = await progressService.markLessonComplete('student-123', 'course-xyz', 'lesson-5');

      expect(result.percentage).toBe(100);
      expect(result.completedLessons).toHaveLength(5);
    });
  });

  describe('trackLessonAccess', () => {
    it('should call repository to update lastAccessedLesson', async () => {
      const studentId = 'student-123';
      const courseId = 'course-abc';
      const lessonId = 'lesson-3';

      mockUpdateLastAccessedLesson.mockResolvedValue(undefined);

      await progressService.trackLessonAccess(studentId, courseId, lessonId);

      expect(mockUpdateLastAccessedLesson).toHaveBeenCalledTimes(1);
      expect(mockUpdateLastAccessedLesson).toHaveBeenCalledWith(studentId, courseId, lessonId);
    });

    it('should not call getProgress or saveProgress', async () => {
      mockUpdateLastAccessedLesson.mockResolvedValue(undefined);

      await progressService.trackLessonAccess('student-456', 'course-xyz', 'lesson-1');

      expect(mockGetProgress).not.toHaveBeenCalled();
      expect(mockSaveProgress).not.toHaveBeenCalled();
      expect(mockGetTotalLessons).not.toHaveBeenCalled();
    });

    it('should not return any value', async () => {
      mockUpdateLastAccessedLesson.mockResolvedValue(undefined);

      const result = await progressService.trackLessonAccess('student-789', 'course-123', 'lesson-5');

      expect(result).toBeUndefined();
    });
  });
});
