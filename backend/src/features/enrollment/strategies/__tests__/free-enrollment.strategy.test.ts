import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import { enrollmentRepository } from '../../enrollment.repository.js';
import type { Enrollment, EnrollmentCompletedEvent } from '../../enrollment.types.js';

// Mock SNS client
const mockSend = jest.fn();
jest.unstable_mockModule('../../../../lib/sns.js', () => ({
  getSnsClient: () => ({
    send: mockSend,
  }),
  PublishCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

// Mock metrics
const mockAddMetric = jest.fn();
jest.unstable_mockModule('../../../../lib/metrics.js', () => ({
  createMetrics: () => ({
    addMetric: mockAddMetric,
    publishStoredMetrics: jest.fn(),
  }),
  MetricUnit: {
    Count: 'Count',
  },
}));

// Import FreeEnrollmentStrategy AFTER mocking
const { FreeEnrollmentStrategy } = await import('../free-enrollment.strategy.js');

describe('FreeEnrollmentStrategy', () => {
  let strategy: FreeEnrollmentStrategy;
  let mockCreate: jest.SpyInstance;
  const originalEnv = process.env.TRANSACTIONAL_EMAIL_TOPIC_ARN;

  beforeAll(() => {
    mockCreate = jest.spyOn(enrollmentRepository, 'create');
    process.env.TRANSACTIONAL_EMAIL_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789:test-topic';
  });

  beforeEach(() => {
    strategy = new FreeEnrollmentStrategy();
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ MessageId: 'test-message-id' });
  });

  afterAll(() => {
    mockCreate.mockRestore();
    process.env.TRANSACTIONAL_EMAIL_TOPIC_ARN = originalEnv;
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

  describe('SNS event publishing', () => {
    it('should publish EnrollmentCompleted event to SNS after successful enrollment', async () => {
      const userId = 'user-sns-test';
      const courseId = 'course-sns-test';

      mockCreate.mockResolvedValue(undefined);

      await strategy.enroll(userId, courseId);

      expect(mockSend).toHaveBeenCalledTimes(1);

      const publishCommand = mockSend.mock.calls[0][0];
      expect(publishCommand.input.TopicArn).toBe('arn:aws:sns:us-east-1:123456789:test-topic');
      expect(publishCommand.input.Subject).toBe('Enrollment Completed');

      const message = JSON.parse(publishCommand.input.Message) as EnrollmentCompletedEvent;
      expect(message.eventType).toBe('EnrollmentCompleted');
      expect(message.studentId).toBe(userId);
      expect(message.courseId).toBe(courseId);
      expect(message.enrollmentType).toBe('free');
      expect(message.enrolledAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should still return enrollment when SNS publish fails', async () => {
      const userId = 'user-sns-fail';
      const courseId = 'course-sns-fail';

      mockCreate.mockResolvedValue(undefined);
      mockSend.mockRejectedValue(new Error('SNS service unavailable'));

      const result = await strategy.enroll(userId, courseId);

      // Enrollment should still succeed (fire-and-forget pattern)
      expect(result.status).toBe('active');
      expect(result.enrollment?.userId).toBe(userId);
      expect(result.enrollment?.courseId).toBe(courseId);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should record EnrollmentEventPublished metric on SNS success', async () => {
      const userId = 'user-metric-success';
      const courseId = 'course-metric-success';

      mockCreate.mockResolvedValue(undefined);

      await strategy.enroll(userId, courseId);

      expect(mockAddMetric).toHaveBeenCalledWith(
        'EnrollmentEventPublished',
        expect.anything(),
        1
      );
    });

    it('should record EnrollmentEventPublishFailed metric on SNS failure', async () => {
      const userId = 'user-metric-fail';
      const courseId = 'course-metric-fail';

      mockCreate.mockResolvedValue(undefined);
      mockSend.mockRejectedValue(new Error('SNS error'));

      await strategy.enroll(userId, courseId);

      expect(mockAddMetric).toHaveBeenCalledWith(
        'EnrollmentEventPublishFailed',
        expect.anything(),
        1
      );
    });

    it('should use same enrolledAt timestamp in both enrollment and SNS event', async () => {
      const userId = 'user-timestamp';
      const courseId = 'course-timestamp';

      mockCreate.mockResolvedValue(undefined);

      const result = await strategy.enroll(userId, courseId);

      const publishCommand = mockSend.mock.calls[0][0];
      const snsMessage = JSON.parse(publishCommand.input.Message) as EnrollmentCompletedEvent;

      expect(result.enrollment?.enrolledAt).toBe(snsMessage.enrolledAt);
    });
  });
});
