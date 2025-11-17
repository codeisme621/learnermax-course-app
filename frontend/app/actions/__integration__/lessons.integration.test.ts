/**
 * Integration tests for lesson server actions with MSW
 * Tests the full network request/response cycle
 */
import { getLessons, getVideoUrl } from '../lessons';
import * as auth from '../auth';
import { server } from './setup';
import { http, HttpResponse } from 'msw';

// Mock auth module
jest.mock('../auth', () => ({
  getAuthToken: jest.fn(),
}));

describe('Lessons Integration Tests', () => {
  const mockToken = 'mock-jwt-token';
  const mockCourseId = 'spec-driven-dev-mini';
  const mockLessonId = 'lesson-1';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080';
    (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
  });

  describe('getLessons', () => {
    it('fetches lessons and returns complete response', async () => {
      const result = await getLessons(mockCourseId);

      if ('error' in result) {
        throw new Error('Expected lessons, got error: ' + result.error);
      }

      expect(result.lessons).toHaveLength(3);
      expect(result.totalLessons).toBe(3);
      expect(result.lessons[0]).toMatchObject({
        lessonId: 'lesson-1',
        courseId: 'spec-driven-dev-mini',
        title: expect.any(String),
        order: 1,
      });
    });

    it('handles 404 course not found', async () => {
      const result = await getLessons('not-found');

      expect(result).toEqual({
        error: 'Course not found',
      });
    });

    it('handles 403 not enrolled', async () => {
      const result = await getLessons('not-enrolled');

      expect(result).toEqual({
        error: 'Not enrolled in this course',
      });
    });

    it('handles server errors gracefully', async () => {
      // Override handler for this test
      server.use(
        http.get('http://localhost:8080/api/courses/:courseId/lessons', () => {
          return HttpResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
          );
        })
      );

      const result = await getLessons(mockCourseId);

      expect(result).toEqual({
        error: expect.stringContaining('Failed to fetch lessons'),
      });
    });
  });

  describe('getVideoUrl', () => {
    it('fetches signed video URL', async () => {
      const result = await getVideoUrl(mockLessonId);

      if ('error' in result) {
        throw new Error('Expected video URL, got error: ' + result.error);
      }

      expect(result.videoUrl).toContain('cloudfront.net');
      expect(result.videoUrl).toContain(mockLessonId);
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('verifies URL expiration is ~30 minutes', async () => {
      const result = await getVideoUrl(mockLessonId);

      if ('error' in result) {
        throw new Error('Expected video URL, got error');
      }

      const now = Math.floor(Date.now() / 1000);
      const expectedExpiry = now + 1800; // 30 minutes

      // Allow 2 minute variance
      expect(result.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 120);
      expect(result.expiresAt).toBeLessThanOrEqual(expectedExpiry + 120);
    });

    it('handles 404 lesson not found', async () => {
      const result = await getVideoUrl('not-found');

      expect(result).toEqual({
        error: 'Lesson not found',
      });
    });

    it('handles 403 not enrolled', async () => {
      const result = await getVideoUrl('not-enrolled');

      expect(result).toEqual({
        error: 'Not enrolled in this course',
      });
    });
  });
});
