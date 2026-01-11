/**
 * Unit tests for Video Access Routes
 */

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

// Mock video access service BEFORE importing routes
const mockGetVideoAccessCookies = jest.fn();
const mockVideoAccessForbiddenError = class extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoAccessForbiddenError';
  }
};

jest.unstable_mockModule('../video-access.service.js', () => ({
  videoAccessService: {
    getVideoAccessCookies: mockGetVideoAccessCookies,
  },
  VideoAccessForbiddenError: mockVideoAccessForbiddenError,
}));

// Import after mocking
const videoAccessRoutes = (await import('../video-access.routes.js')).default;

describe('Video Access Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/courses', videoAccessRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/courses/:courseId/video-access', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app).get('/api/courses/course-123/video-access');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(mockGetVideoAccessCookies).not.toHaveBeenCalled();
    });

    it('should return 200 with cookies for enrolled user', async () => {
      const userId = 'user-123';
      const courseId = 'spec-driven-dev-mini';

      const mockCookies = {
        'CloudFront-Policy': 'test-policy-value',
        'CloudFront-Signature': 'test-signature-value',
        'CloudFront-Key-Pair-Id': 'APKA4NJ63SK4YPQIZU5D',
      };

      mockGetVideoAccessCookies.mockResolvedValue(mockCookies);

      const response = await request(app)
        .get(`/api/courses/${courseId}/video-access`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        cookies: mockCookies,
      });
      expect(mockGetVideoAccessCookies).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return 403 if user not enrolled in course', async () => {
      const userId = 'user-123';
      const courseId = 'course-not-enrolled';

      mockGetVideoAccessCookies.mockRejectedValue(
        new mockVideoAccessForbiddenError('Not enrolled in this course')
      );

      const response = await request(app)
        .get(`/api/courses/${courseId}/video-access`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Not enrolled in this course',
      });
      expect(mockGetVideoAccessCookies).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return 500 if cookie generation fails', async () => {
      const userId = 'user-123';
      const courseId = 'spec-driven-dev-mini';

      mockGetVideoAccessCookies.mockRejectedValue(new Error('Secrets Manager error'));

      const response = await request(app)
        .get(`/api/courses/${courseId}/video-access`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to generate video access cookies',
      });
      expect(mockGetVideoAccessCookies).toHaveBeenCalledWith(userId, courseId);
    });

    it('should pass correct userId from auth context', async () => {
      const userId = 'specific-user-id-456';
      const courseId = 'test-course';

      mockGetVideoAccessCookies.mockResolvedValue({
        'CloudFront-Policy': 'p',
        'CloudFront-Signature': 's',
        'CloudFront-Key-Pair-Id': 'k',
      });

      await request(app)
        .get(`/api/courses/${courseId}/video-access`)
        .set(createAuthHeader(userId));

      expect(mockGetVideoAccessCookies).toHaveBeenCalledWith(userId, courseId);
    });

    it('should pass correct courseId from URL params', async () => {
      const userId = 'user-123';
      const courseId = 'my-special-course-id';

      mockGetVideoAccessCookies.mockResolvedValue({
        'CloudFront-Policy': 'p',
        'CloudFront-Signature': 's',
        'CloudFront-Key-Pair-Id': 'k',
      });

      await request(app)
        .get(`/api/courses/${courseId}/video-access`)
        .set(createAuthHeader(userId));

      expect(mockGetVideoAccessCookies).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return all three CloudFront cookie values', async () => {
      const userId = 'user-123';
      const courseId = 'course-123';

      const mockCookies = {
        'CloudFront-Policy': 'base64-encoded-policy',
        'CloudFront-Signature': 'rsa-signature-value',
        'CloudFront-Key-Pair-Id': 'APKA12345',
      };

      mockGetVideoAccessCookies.mockResolvedValue(mockCookies);

      const response = await request(app)
        .get(`/api/courses/${courseId}/video-access`)
        .set(createAuthHeader(userId));

      expect(response.body.cookies).toHaveProperty('CloudFront-Policy');
      expect(response.body.cookies).toHaveProperty('CloudFront-Signature');
      expect(response.body.cookies).toHaveProperty('CloudFront-Key-Pair-Id');
      expect(Object.keys(response.body.cookies)).toHaveLength(3);
    });
  });
});
