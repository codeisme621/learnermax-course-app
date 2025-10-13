import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import enrollmentRoutes from '../enrollment.routes.js';
import { enrollmentService } from '../enrollment.service.js';
import { enrollmentRepository } from '../enrollment.repository.js';
import type { Enrollment, EnrollmentResult } from '../enrollment.types.js';

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

describe('Enrollment Routes', () => {
  let app: express.Application;
  let mockEnrollUser: jest.SpyInstance;
  let mockCheckEnrollment: jest.SpyInstance;
  let mockGetUserEnrollments: jest.SpyInstance;

  beforeAll(() => {
    mockEnrollUser = jest.spyOn(enrollmentService, 'enrollUser');
    mockCheckEnrollment = jest.spyOn(enrollmentService, 'checkEnrollment');
    mockGetUserEnrollments = jest.spyOn(enrollmentRepository, 'getUserEnrollments');
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/enrollments', enrollmentRoutes);
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockEnrollUser.mockRestore();
    mockCheckEnrollment.mockRestore();
    mockGetUserEnrollments.mockRestore();
  });

  describe('POST /api/enrollments', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app)
        .post('/api/enrollments')
        .send({ courseId: 'course-123' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockEnrollUser).not.toHaveBeenCalled();
    });

    it('should return 400 if courseId is missing', async () => {
      const userId = 'user-123';

      const response = await request(app)
        .post('/api/enrollments')
        .set(createAuthHeader(userId))
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'courseId is required' });
      expect(mockEnrollUser).not.toHaveBeenCalled();
    });

    it('should successfully enroll user', async () => {
      const userId = 'user-123';
      const courseId = 'course-456';
      const enrollmentResult: EnrollmentResult = {
        enrollment: {
          userId,
          courseId,
          enrollmentType: 'free',
          enrolledAt: '2025-01-01T00:00:00Z',
          paymentStatus: 'free',
          progress: 0,
          completed: false,
        },
        status: 'active',
      };

      mockEnrollUser.mockResolvedValue(enrollmentResult);

      const response = await request(app)
        .post('/api/enrollments')
        .set(createAuthHeader(userId))
        .send({ courseId });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(enrollmentResult);
      expect(mockEnrollUser).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return 500 if enrollment fails', async () => {
      const userId = 'user-123';
      const courseId = 'course-456';

      mockEnrollUser.mockRejectedValue(new Error('Enrollment failed'));

      const response = await request(app)
        .post('/api/enrollments')
        .set(createAuthHeader(userId))
        .send({ courseId });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to enroll' });
      expect(mockEnrollUser).toHaveBeenCalledWith(userId, courseId);
    });
  });

  describe('GET /api/enrollments', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app).get('/api/enrollments');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockGetUserEnrollments).not.toHaveBeenCalled();
    });

    it('should return user enrollments', async () => {
      const userId = 'user-123';
      const enrollments: Enrollment[] = [
        {
          userId,
          courseId: 'course-1',
          enrollmentType: 'free',
          enrolledAt: '2025-01-01T00:00:00Z',
          paymentStatus: 'free',
          progress: 0,
          completed: false,
        },
        {
          userId,
          courseId: 'course-2',
          enrollmentType: 'free',
          enrolledAt: '2025-01-02T00:00:00Z',
          paymentStatus: 'free',
          progress: 0,
          completed: false,
        },
      ];

      mockGetUserEnrollments.mockResolvedValue(enrollments);

      const response = await request(app)
        .get('/api/enrollments')
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(enrollments);
      expect(mockGetUserEnrollments).toHaveBeenCalledWith(userId);
    });

    it('should return empty array if no enrollments', async () => {
      const userId = 'user-123';

      mockGetUserEnrollments.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/enrollments')
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(mockGetUserEnrollments).toHaveBeenCalledWith(userId);
    });

    it('should return 500 if fetching enrollments fails', async () => {
      const userId = 'user-123';

      mockGetUserEnrollments.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .get('/api/enrollments')
        .set(createAuthHeader(userId));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get enrollments' });
    });
  });

  describe('GET /api/enrollments/check/:courseId', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app).get('/api/enrollments/check/course-123');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockCheckEnrollment).not.toHaveBeenCalled();
    });

    it('should return enrollment status true if enrolled', async () => {
      const userId = 'user-123';
      const courseId = 'course-456';

      mockCheckEnrollment.mockResolvedValue(true);

      const response = await request(app)
        .get(`/api/enrollments/check/${courseId}`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ enrolled: true });
      expect(mockCheckEnrollment).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return enrollment status false if not enrolled', async () => {
      const userId = 'user-123';
      const courseId = 'course-456';

      mockCheckEnrollment.mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/enrollments/check/${courseId}`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ enrolled: false });
      expect(mockCheckEnrollment).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return 500 if check enrollment fails', async () => {
      const userId = 'user-123';
      const courseId = 'course-456';

      mockCheckEnrollment.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/enrollments/check/${courseId}`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to check enrollment' });
    });
  });
});
