import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import progressRoutes from '../progress.routes.js';
import { progressService } from '../progress.service.js';
import type { ProgressResponse } from '../progress.types.js';

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

describe('Progress Routes', () => {
  let app: express.Application;
  let mockGetProgress: jest.SpyInstance;
  let mockMarkLessonComplete: jest.SpyInstance;
  let mockTrackLessonAccess: jest.SpyInstance;

  beforeAll(() => {
    mockGetProgress = jest.spyOn(progressService, 'getProgress');
    mockMarkLessonComplete = jest.spyOn(progressService, 'markLessonComplete');
    mockTrackLessonAccess = jest.spyOn(progressService, 'trackLessonAccess');
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/progress', progressRoutes);
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGetProgress.mockRestore();
    mockMarkLessonComplete.mockRestore();
    mockTrackLessonAccess.mockRestore();
  });

  describe('GET /api/progress/:courseId', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app).get('/api/progress/course-123');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockGetProgress).not.toHaveBeenCalled();
    });

    it('should return existing progress', async () => {
      const userId = 'user-123';
      const courseId = 'spec-driven-dev-mini';

      const progress: ProgressResponse = {
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 40,
        totalLessons: 5,
        updatedAt: '2025-01-15T10:30:00Z',
      };

      mockGetProgress.mockResolvedValue(progress);

      const response = await request(app)
        .get(`/api/progress/${courseId}`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(progress);
      expect(mockGetProgress).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return default empty progress for new student', async () => {
      const userId = 'user-456';
      const courseId = 'new-course';

      const emptyProgress: ProgressResponse = {
        courseId: 'new-course',
        completedLessons: [],
        percentage: 0,
        totalLessons: 10,
        updatedAt: '2025-01-15T11:00:00Z',
      };

      mockGetProgress.mockResolvedValue(emptyProgress);

      const response = await request(app)
        .get(`/api/progress/${courseId}`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(emptyProgress);
      expect(mockGetProgress).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return 500 if service throws error', async () => {
      const userId = 'user-789';
      const courseId = 'course-123';

      mockGetProgress.mockRejectedValue(new Error('DynamoDB error'));

      const response = await request(app)
        .get(`/api/progress/${courseId}`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch progress' });
      expect(mockGetProgress).toHaveBeenCalledWith(userId, courseId);
    });
  });

  describe('POST /api/progress', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app).post('/api/progress').send({
        courseId: 'course-123',
        lessonId: 'lesson-1',
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockMarkLessonComplete).not.toHaveBeenCalled();
    });

    it('should return 400 if courseId is missing', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userId))
        .send({
          lessonId: 'lesson-1',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
      expect(mockMarkLessonComplete).not.toHaveBeenCalled();
    });

    it('should return 400 if lessonId is missing', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userId))
        .send({
          courseId: 'course-123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
      expect(mockMarkLessonComplete).not.toHaveBeenCalled();
    });

    it('should return 400 if courseId is not a string', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userId))
        .send({
          courseId: 123,
          lessonId: 'lesson-1',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
      expect(mockMarkLessonComplete).not.toHaveBeenCalled();
    });

    it('should return 400 if lessonId is not a string', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userId))
        .send({
          courseId: 'course-123',
          lessonId: 123,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
      expect(mockMarkLessonComplete).not.toHaveBeenCalled();
    });

    it('should successfully mark lesson as complete', async () => {
      const userId = 'user-123';
      const courseId = 'spec-driven-dev-mini';
      const lessonId = 'lesson-3';

      const updatedProgress: ProgressResponse = {
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        lastAccessedLesson: 'lesson-3',
        percentage: 60,
        totalLessons: 5,
        updatedAt: '2025-01-15T12:00:00Z',
      };

      mockMarkLessonComplete.mockResolvedValue(updatedProgress);

      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userId))
        .send({
          courseId,
          lessonId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedProgress);
      expect(mockMarkLessonComplete).toHaveBeenCalledWith(userId, courseId, lessonId);
    });

    it('should handle marking first lesson as complete', async () => {
      const userId = 'user-new';
      const courseId = 'course-abc';
      const lessonId = 'lesson-1';

      const updatedProgress: ProgressResponse = {
        courseId: 'course-abc',
        completedLessons: ['lesson-1'],
        lastAccessedLesson: 'lesson-1',
        percentage: 20,
        totalLessons: 5,
        updatedAt: '2025-01-15T13:00:00Z',
      };

      mockMarkLessonComplete.mockResolvedValue(updatedProgress);

      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userId))
        .send({
          courseId,
          lessonId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedProgress);
      expect(mockMarkLessonComplete).toHaveBeenCalledWith(userId, courseId, lessonId);
    });

    it('should handle completing final lesson (100%)', async () => {
      const userId = 'user-456';
      const courseId = 'course-xyz';
      const lessonId = 'lesson-5';

      const updatedProgress: ProgressResponse = {
        courseId: 'course-xyz',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4', 'lesson-5'],
        lastAccessedLesson: 'lesson-5',
        percentage: 100,
        totalLessons: 5,
        updatedAt: '2025-01-15T14:00:00Z',
      };

      mockMarkLessonComplete.mockResolvedValue(updatedProgress);

      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userId))
        .send({
          courseId,
          lessonId,
        });

      expect(response.status).toBe(200);
      expect(response.body.percentage).toBe(100);
      expect(response.body.completedLessons).toHaveLength(5);
    });

    it('should return 500 if service throws error', async () => {
      const userId = 'user-789';
      const courseId = 'course-123';
      const lessonId = 'lesson-1';

      mockMarkLessonComplete.mockRejectedValue(new Error('DynamoDB error'));

      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userId))
        .send({
          courseId,
          lessonId,
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to update progress' });
      expect(mockMarkLessonComplete).toHaveBeenCalledWith(userId, courseId, lessonId);
    });
  });

  describe('POST /api/progress/access', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app).post('/api/progress/access').send({
        courseId: 'course-123',
        lessonId: 'lesson-1',
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockTrackLessonAccess).not.toHaveBeenCalled();
    });

    it('should return 400 if courseId is missing', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(userId))
        .send({
          lessonId: 'lesson-1',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
      expect(mockTrackLessonAccess).not.toHaveBeenCalled();
    });

    it('should return 400 if lessonId is missing', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(userId))
        .send({
          courseId: 'course-123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
      expect(mockTrackLessonAccess).not.toHaveBeenCalled();
    });

    it('should return 400 if courseId is not a string', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(userId))
        .send({
          courseId: 123,
          lessonId: 'lesson-1',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
      expect(mockTrackLessonAccess).not.toHaveBeenCalled();
    });

    it('should return 400 if lessonId is not a string', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(userId))
        .send({
          courseId: 'course-123',
          lessonId: 123,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
      expect(mockTrackLessonAccess).not.toHaveBeenCalled();
    });

    it('should successfully track lesson access with 204 response', async () => {
      const userId = 'user-123';
      const courseId = 'spec-driven-dev-mini';
      const lessonId = 'lesson-3';

      mockTrackLessonAccess.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(userId))
        .send({
          courseId,
          lessonId,
        });

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(mockTrackLessonAccess).toHaveBeenCalledWith(userId, courseId, lessonId);
    });

    it('should not call markLessonComplete when tracking access', async () => {
      const userId = 'user-456';

      mockTrackLessonAccess.mockResolvedValue(undefined);

      await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(userId))
        .send({
          courseId: 'course-abc',
          lessonId: 'lesson-1',
        });

      expect(mockTrackLessonAccess).toHaveBeenCalledTimes(1);
      expect(mockMarkLessonComplete).not.toHaveBeenCalled();
    });

    it('should return 500 if service throws error', async () => {
      const userId = 'user-789';
      const courseId = 'course-123';
      const lessonId = 'lesson-1';

      mockTrackLessonAccess.mockRejectedValue(new Error('DynamoDB error'));

      const response = await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(userId))
        .send({
          courseId,
          lessonId,
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to track lesson access' });
      expect(mockTrackLessonAccess).toHaveBeenCalledWith(userId, courseId, lessonId);
    });
  });
});
