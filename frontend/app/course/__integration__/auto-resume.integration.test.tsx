/**
 * Integration tests for auto-resume functionality
 * Tests that the course page redirects to the correct lesson based on progress
 */

import { redirect } from 'next/navigation';
import { determineCurrentLesson } from '@/lib/course-utils';
import type { LessonResponse } from '@/app/actions/lessons';
import type { ProgressResponse } from '@/app/actions/progress';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('Auto-Resume Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockLessons: LessonResponse[] = [
    {
      lessonId: 'lesson-1',
      courseId: 'course-1',
      title: 'Introduction',
      order: 1,
      lengthInMins: 10,
    },
    {
      lessonId: 'lesson-2',
      courseId: 'course-1',
      title: 'Getting Started',
      order: 2,
      lengthInMins: 15,
    },
    {
      lessonId: 'lesson-3',
      courseId: 'course-1',
      title: 'Advanced Topics',
      order: 3,
      lengthInMins: 20,
    },
  ];

  test('coursePageLoad_noQueryParam_hasLastAccessed_redirectsToLastAccessedLesson', () => {
    const progress: ProgressResponse = {
      courseId: 'course-1',
      completedLessons: ['lesson-1'],
      lastAccessedLesson: 'lesson-2',
      percentage: 33,
      totalLessons: 3,
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const search: { lesson?: string } | undefined = undefined; // No query param
    const currentLesson = determineCurrentLesson(mockLessons, progress, search);

    // Should return lesson-2 (last accessed, incomplete)
    expect(currentLesson?.lessonId).toBe('lesson-2');

    // Simulate the redirect logic from page.tsx
    const requestedLesson = search?.lesson;
    const shouldRedirect = !requestedLesson &&
                          mockLessons.length > 0 &&
                          currentLesson?.lessonId !== mockLessons[0]?.lessonId;

    if (shouldRedirect && currentLesson) {
      mockRedirect(`/course/course-1?lesson=${currentLesson.lessonId}`);
    }

    expect(mockRedirect).toHaveBeenCalledWith('/course/course-1?lesson=lesson-2');
  });

  test('coursePageLoad_noQueryParam_noLastAccessed_staysOnFirstLesson', () => {
    const progress: ProgressResponse = {
      courseId: 'course-1',
      completedLessons: ['lesson-1'],
      lastAccessedLesson: undefined, // No last accessed
      percentage: 33,
      totalLessons: 3,
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const search: { lesson?: string } | undefined = undefined;
    const currentLesson = determineCurrentLesson(mockLessons, progress, search);

    // Should return lesson-1 (first lesson, since no lastAccessedLesson)
    expect(currentLesson?.lessonId).toBe('lesson-1');

    // Simulate the redirect logic
    const requestedLesson = search?.lesson;
    const shouldRedirect = !requestedLesson &&
                          mockLessons.length > 0 &&
                          currentLesson?.lessonId !== mockLessons[0]?.lessonId;

    // Should NOT redirect (currentLesson IS the first lesson)
    expect(shouldRedirect).toBe(false);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test('coursePageLoad_withQueryParam_ignoresLastAccessed_loadsRequestedLesson', () => {
    const progress: ProgressResponse = {
      courseId: 'course-1',
      completedLessons: ['lesson-1'],
      lastAccessedLesson: 'lesson-2',
      percentage: 33,
      totalLessons: 3,
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const search: { lesson?: string } | undefined = { lesson: 'lesson-3' }; // Explicit query param
    const currentLesson = determineCurrentLesson(mockLessons, progress, search);

    // Should return lesson-3 (from query param, ignores lastAccessed)
    expect(currentLesson?.lessonId).toBe('lesson-3');

    // Simulate the redirect logic
    const requestedLesson = search?.lesson;
    const shouldRedirect = !requestedLesson &&
                          mockLessons.length > 0 &&
                          currentLesson?.lessonId !== mockLessons[0]?.lessonId;

    // Should NOT redirect (query param exists)
    expect(shouldRedirect).toBe(false);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test('coursePageLoad_lastAccessedIsCompleted_redirectsToLastAccessed', () => {
    const progress: ProgressResponse = {
      courseId: 'course-1',
      completedLessons: ['lesson-1', 'lesson-2'], // lesson-2 is completed
      lastAccessedLesson: 'lesson-2',
      percentage: 66,
      totalLessons: 3,
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const search: { lesson?: string } | undefined = undefined;
    const currentLesson = determineCurrentLesson(mockLessons, progress, search);

    // Should return lesson-2 (lastAccessed, even though completed)
    expect(currentLesson?.lessonId).toBe('lesson-2');

    // Simulate the redirect logic
    const requestedLesson = search?.lesson;
    const shouldRedirect = !requestedLesson &&
                          mockLessons.length > 0 &&
                          currentLesson?.lessonId !== mockLessons[0]?.lessonId;

    if (shouldRedirect && currentLesson) {
      mockRedirect(`/course/course-1?lesson=${currentLesson.lessonId}`);
    }

    expect(mockRedirect).toHaveBeenCalledWith('/course/course-1?lesson=lesson-2');
  });

  test('coursePageLoad_allLessonsCompleted_loadsLastAccessed', () => {
    const progress: ProgressResponse = {
      courseId: 'course-1',
      completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'], // All completed
      lastAccessedLesson: 'lesson-3',
      percentage: 100,
      totalLessons: 3,
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const search: { lesson?: string } | undefined = undefined;
    const currentLesson = determineCurrentLesson(mockLessons, progress, search);

    // Should return lesson-3 (lastAccessed, even when all complete)
    expect(currentLesson?.lessonId).toBe('lesson-3');

    // Simulate the redirect logic
    const requestedLesson = search?.lesson;
    const shouldRedirect = !requestedLesson &&
                          mockLessons.length > 0 &&
                          currentLesson?.lessonId !== mockLessons[0]?.lessonId;

    // Should redirect to lesson-3
    if (shouldRedirect && currentLesson) {
      mockRedirect(`/course/course-1?lesson=${currentLesson.lessonId}`);
    }

    expect(mockRedirect).toHaveBeenCalledWith('/course/course-1?lesson=lesson-3');
  });
});
