import {
  jest,
  describe,
  it,
  beforeAll,
  beforeEach,
  afterAll,
  expect,
} from '@jest/globals';
import { LessonService } from '../lesson.service.js';
import { lessonRepository } from '../lesson.repository.js';
import type { Lesson, LessonResponse } from '../lesson.types.js';

describe('LessonService', () => {
  let service: LessonService;
  let mockGetLessonsByCourse: jest.SpyInstance;
  let mockGetLesson: jest.SpyInstance;
  let mockGetTotalLessons: jest.SpyInstance;

  beforeAll(() => {
    // Mock the repository
    mockGetLessonsByCourse = jest.spyOn(
      lessonRepository,
      'getLessonsByCourse'
    );
    mockGetLesson = jest.spyOn(lessonRepository, 'getLesson');
    mockGetTotalLessons = jest.spyOn(lessonRepository, 'getTotalLessons');
  });

  beforeEach(() => {
    service = new LessonService();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGetLessonsByCourse.mockRestore();
    mockGetLesson.mockRestore();
    mockGetTotalLessons.mockRestore();
  });

  describe('getLessonsByCourse', () => {
    it('should return lessons transformed to LessonResponse (excluding videoKey)', async () => {
      const courseId = 'spec-driven-dev-mini';
      const lessons: Lesson[] = [
        {
          lessonId: 'lesson-1',
          courseId: 'spec-driven-dev-mini',
          title: 'Introduction to Spec-Driven Development',
          description: 'Learn the fundamentals',
          lengthInMins: 15,
          videoKey: 'courses/spec-driven-dev-mini/lesson-1.mp4',
          order: 1,
        },
        {
          lessonId: 'lesson-2',
          courseId: 'spec-driven-dev-mini',
          title: 'Writing Your First Spec',
          lengthInMins: 20,
          videoKey: 'courses/spec-driven-dev-mini/lesson-2.mp4',
          order: 2,
        },
      ];

      mockGetLessonsByCourse.mockResolvedValue(lessons);

      const result = await service.getLessonsByCourse(courseId);

      // Verify videoKey is NOT included in response
      const expected: LessonResponse[] = [
        {
          lessonId: 'lesson-1',
          courseId: 'spec-driven-dev-mini',
          title: 'Introduction to Spec-Driven Development',
          description: 'Learn the fundamentals',
          lengthInMins: 15,
          order: 1,
        },
        {
          lessonId: 'lesson-2',
          courseId: 'spec-driven-dev-mini',
          title: 'Writing Your First Spec',
          lengthInMins: 20,
          order: 2,
        },
      ];

      expect(result).toEqual(expected);
      expect(mockGetLessonsByCourse).toHaveBeenCalledWith(courseId);

      // Ensure videoKey is NOT in response
      result.forEach((lesson: any) => {
        expect(lesson.videoKey).toBeUndefined();
      });
    });

    it('should return empty array if no lessons exist', async () => {
      const courseId = 'empty-course';

      mockGetLessonsByCourse.mockResolvedValue([]);

      const result = await service.getLessonsByCourse(courseId);

      expect(result).toEqual([]);
      expect(mockGetLessonsByCourse).toHaveBeenCalledWith(courseId);
    });
  });

  describe('getLesson', () => {
    it('should return lesson with videoKey (for internal use)', async () => {
      const lessonId = 'lesson-1';
      const lesson: Lesson = {
        lessonId: 'lesson-1',
        courseId: 'spec-driven-dev-mini',
        title: 'Introduction to Spec-Driven Development',
        description: 'Learn the fundamentals',
        lengthInMins: 15,
        videoKey: 'courses/spec-driven-dev-mini/lesson-1.mp4',
        order: 1,
      };

      mockGetLesson.mockResolvedValue(lesson);

      const result = await service.getLesson(lessonId);

      expect(result).toEqual(lesson);
      expect(result?.videoKey).toBe('courses/spec-driven-dev-mini/lesson-1.mp4');
      expect(mockGetLesson).toHaveBeenCalledWith(lessonId);
    });

    it('should return undefined if lesson not found', async () => {
      const lessonId = 'nonexistent-lesson';

      mockGetLesson.mockResolvedValue(undefined);

      const result = await service.getLesson(lessonId);

      expect(result).toBeUndefined();
      expect(mockGetLesson).toHaveBeenCalledWith(lessonId);
    });
  });

  describe('getTotalLessons', () => {
    it('should return total count of lessons for a course', async () => {
      const courseId = 'spec-driven-dev-mini';
      const total = 5;

      mockGetTotalLessons.mockResolvedValue(total);

      const result = await service.getTotalLessons(courseId);

      expect(result).toBe(5);
      expect(mockGetTotalLessons).toHaveBeenCalledWith(courseId);
    });

    it('should return 0 if course has no lessons', async () => {
      const courseId = 'empty-course';

      mockGetTotalLessons.mockResolvedValue(0);

      const result = await service.getTotalLessons(courseId);

      expect(result).toBe(0);
      expect(mockGetTotalLessons).toHaveBeenCalledWith(courseId);
    });
  });
});
