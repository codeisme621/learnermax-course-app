import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Helper to create auth header
function createAuthHeader(userId: string): Record<string, string> {
  return {
    'x-amzn-request-context': JSON.stringify({
      authorizer: {
        claims: {
          sub: userId,
          email: 'test@example.com',
        },
      },
    }),
  };
}

// Mock video URL provider BEFORE importing routes
const mockGenerateSignedUrl = jest.fn();
jest.unstable_mockModule('../services/video-url-service', () => ({
  createVideoUrlProvider: () => ({
    generateSignedUrl: mockGenerateSignedUrl,
  }),
}));

// Import after mocking
const lessonRoutes = (await import('../lesson.routes.js')).default;
const { lessonService } = await import('../lesson.service.js');
const { enrollmentService } = await import('../../enrollment/enrollment.service.js');

import type { Lesson, LessonResponse } from '../lesson.types.js';

describe('Lesson Routes', () => {
  let app: express.Application;
  let mockGetLesson: jest.SpyInstance;
  let mockCheckEnrollment: jest.SpyInstance;

  beforeAll(() => {
    mockGetLesson = jest.spyOn(lessonService, 'getLesson');
    mockCheckEnrollment = jest.spyOn(enrollmentService, 'checkEnrollment');
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/lessons', lessonRoutes);
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGetLesson.mockRestore();
    mockCheckEnrollment.mockRestore();
  });

  describe('GET /api/lessons/:lessonId/video-url', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app).get('/api/lessons/lesson-123/video-url');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockGetLesson).not.toHaveBeenCalled();
    });

    it('should return 404 if lesson not found', async () => {
      const userId = 'user-123';
      const lessonId = 'nonexistent-lesson';

      mockGetLesson.mockResolvedValue(undefined);

      const response = await request(app)
        .get(`/api/lessons/${lessonId}/video-url`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Lesson not found' });
      expect(mockGetLesson).toHaveBeenCalledWith(lessonId);
      expect(mockCheckEnrollment).not.toHaveBeenCalled();
    });

    it('should return 403 if user not enrolled in course', async () => {
      const userId = 'user-123';
      const lessonId = 'lesson-1';

      const lesson: Lesson = {
        lessonId: 'lesson-1',
        courseId: 'spec-driven-dev-mini',
        title: 'Introduction',
        videoKey: 'courses/spec-driven-dev-mini/lesson-1.mp4',
        order: 1,
      };

      mockGetLesson.mockResolvedValue(lesson);
      mockCheckEnrollment.mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/lessons/${lessonId}/video-url`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Not enrolled in this course' });
      expect(mockGetLesson).toHaveBeenCalledWith(lessonId);
      expect(mockCheckEnrollment).toHaveBeenCalledWith(userId, lesson.courseId);
      expect(mockGenerateSignedUrl).not.toHaveBeenCalled();
    });

    it('should successfully generate signed video URL', async () => {
      const userId = 'user-123';
      const lessonId = 'lesson-1';

      const lesson: Lesson = {
        lessonId: 'lesson-1',
        courseId: 'spec-driven-dev-mini',
        title: 'Introduction',
        videoKey: 'courses/spec-driven-dev-mini/lesson-1.mp4',
        order: 1,
      };

      const signedUrlResponse = {
        url: 'https://d123.cloudfront.net/courses/spec-driven-dev-mini/lesson-1.mp4?Signature=...',
        expiresAt: 1736943600,
      };

      mockGetLesson.mockResolvedValue(lesson);
      mockCheckEnrollment.mockResolvedValue(true);
      mockGenerateSignedUrl.mockResolvedValue(signedUrlResponse);

      const response = await request(app)
        .get(`/api/lessons/${lessonId}/video-url`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        videoUrl: signedUrlResponse.url,
        expiresAt: signedUrlResponse.expiresAt,
      });
      expect(mockGetLesson).toHaveBeenCalledWith(lessonId);
      expect(mockCheckEnrollment).toHaveBeenCalledWith(userId, lesson.courseId);
      expect(mockGenerateSignedUrl).toHaveBeenCalledWith(lesson.videoKey);
    });

    it('should return 500 if video URL generation fails', async () => {
      const userId = 'user-123';
      const lessonId = 'lesson-1';

      const lesson: Lesson = {
        lessonId: 'lesson-1',
        courseId: 'spec-driven-dev-mini',
        title: 'Introduction',
        videoKey: 'courses/spec-driven-dev-mini/lesson-1.mp4',
        order: 1,
      };

      mockGetLesson.mockResolvedValue(lesson);
      mockCheckEnrollment.mockResolvedValue(true);
      mockGenerateSignedUrl.mockRejectedValue(new Error('CloudFront error'));

      const response = await request(app)
        .get(`/api/lessons/${lessonId}/video-url`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to generate video URL' });
      expect(mockGetLesson).toHaveBeenCalledWith(lessonId);
      expect(mockCheckEnrollment).toHaveBeenCalledWith(userId, lesson.courseId);
      expect(mockGenerateSignedUrl).toHaveBeenCalledWith(lesson.videoKey);
    });
  });
});
