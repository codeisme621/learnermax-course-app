import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import { FreeEnrollmentStrategy } from '../free-enrollment.strategy.js';
import { enrollmentRepository } from '../../enrollment.repository.js';
import type { Enrollment } from '../../enrollment.types.js';

describe('FreeEnrollmentStrategy', () => {
  let strategy: FreeEnrollmentStrategy;
  let mockCreate: jest.SpyInstance;

  beforeAll(() => {
    mockCreate = jest.spyOn(enrollmentRepository, 'create');
  });

  beforeEach(() => {
    strategy = new FreeEnrollmentStrategy();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockCreate.mockRestore();
  });

  describe('enroll', () => {
    it('should create free enrollment successfully', async () => {
      const userId = 'user-123';
      const courseId = 'course-456';

      mockCreate.mockResolvedValue(undefined);

      const result = await strategy.enroll(userId, courseId);

      expect(result).toEqual({
        enrollment: {
          userId,
          courseId,
          enrollmentType: 'free',
          enrolledAt: expect.any(String),
          paymentStatus: 'free',
          progress: 0,
          completed: false,
        },
        status: 'active',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          courseId,
          enrollmentType: 'free',
          paymentStatus: 'free',
          progress: 0,
          completed: false,
        })
      );
    });

    it('should set enrolledAt to current timestamp', async () => {
      const userId = 'user-789';
      const courseId = 'course-123';
      const beforeEnroll = new Date().toISOString();

      mockCreate.mockResolvedValue(undefined);

      const result = await strategy.enroll(userId, courseId);

      const afterEnroll = new Date().toISOString();

      expect(result.enrollment?.enrolledAt).toBeDefined();
      expect(result.enrollment?.enrolledAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Check timestamp is within reasonable range
      if (result.enrollment?.enrolledAt) {
        expect(result.enrollment.enrolledAt >= beforeEnroll).toBe(true);
        expect(result.enrollment.enrolledAt <= afterEnroll).toBe(true);
      }
    });

    it('should return status as active', async () => {
      const userId = 'user-active';
      const courseId = 'course-active';

      mockCreate.mockResolvedValue(undefined);

      const result = await strategy.enroll(userId, courseId);

      expect(result.status).toBe('active');
    });

    it('should handle repository errors', async () => {
      const userId = 'user-error';
      const courseId = 'course-error';

      mockCreate.mockRejectedValue(new Error('DynamoDB error'));

      await expect(strategy.enroll(userId, courseId)).rejects.toThrow('DynamoDB error');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should create enrollment with progress set to 0', async () => {
      const userId = 'user-progress';
      const courseId = 'course-progress';

      mockCreate.mockResolvedValue(undefined);

      const result = await strategy.enroll(userId, courseId);

      expect(result.enrollment?.progress).toBe(0);
    });

    it('should create enrollment with completed set to false', async () => {
      const userId = 'user-incomplete';
      const courseId = 'course-incomplete';

      mockCreate.mockResolvedValue(undefined);

      const result = await strategy.enroll(userId, courseId);

      expect(result.enrollment?.completed).toBe(false);
    });

    it('should call repository create with correct enrollment object', async () => {
      const userId = 'user-validate';
      const courseId = 'course-validate';

      mockCreate.mockResolvedValue(undefined);

      await strategy.enroll(userId, courseId);

      expect(mockCreate).toHaveBeenCalledTimes(1);

      const callArg = mockCreate.mock.calls[0][0] as Enrollment;
      expect(callArg.userId).toBe(userId);
      expect(callArg.courseId).toBe(courseId);
      expect(callArg.enrollmentType).toBe('free');
      expect(callArg.paymentStatus).toBe('free');
      expect(callArg.progress).toBe(0);
      expect(callArg.completed).toBe(false);
      expect(callArg.enrolledAt).toBeDefined();
    });

    it('should handle multiple enrollments independently', async () => {
      mockCreate.mockResolvedValue(undefined);

      const result1 = await strategy.enroll('user-1', 'course-1');
      const result2 = await strategy.enroll('user-2', 'course-2');

      expect(result1.enrollment?.userId).toBe('user-1');
      expect(result1.enrollment?.courseId).toBe('course-1');
      expect(result2.enrollment?.userId).toBe('user-2');
      expect(result2.enrollment?.courseId).toBe('course-2');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });
});
