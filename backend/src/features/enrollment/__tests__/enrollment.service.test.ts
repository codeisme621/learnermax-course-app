import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import { EnrollmentService } from '../enrollment.service.js';
import { enrollmentRepository } from '../enrollment.repository.js';
import { courseRepository } from '../../courses/course.repository.js';
import { FreeEnrollmentStrategy } from '../strategies/free-enrollment.strategy.js';
import type { Enrollment, EnrollmentResult } from '../enrollment.types.js';
import type { Course } from '../../courses/course.types.js';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let mockEnrollmentGet: jest.SpyInstance;
  let mockEnrollmentGetUserEnrollments: jest.SpyInstance;
  let mockCourseGet: jest.SpyInstance;
  let mockStrategyEnroll: jest.SpyInstance;

  beforeAll(() => {
    // Mock repository methods
    mockEnrollmentGet = jest.spyOn(enrollmentRepository, 'get');
    mockEnrollmentGetUserEnrollments = jest.spyOn(enrollmentRepository, 'getUserEnrollments');
    mockCourseGet = jest.spyOn(courseRepository, 'get');
    mockStrategyEnroll = jest.spyOn(FreeEnrollmentStrategy.prototype, 'enroll');
  });

  beforeEach(() => {
    service = new EnrollmentService();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockEnrollmentGet.mockRestore();
    mockEnrollmentGetUserEnrollments.mockRestore();
    mockCourseGet.mockRestore();
    mockStrategyEnroll.mockRestore();
  });

  describe('enrollUser', () => {
    const userId = 'user-123';
    const courseId = 'course-456';

    it('should return existing enrollment if user already enrolled (idempotency)', async () => {
      const existingEnrollment: Enrollment = {
        userId,
        courseId,
        enrollmentType: 'free',
        enrolledAt: '2025-01-01T00:00:00Z',
        paymentStatus: 'free',
        progress: 0,
        completed: false,
      };

      mockEnrollmentGet.mockResolvedValue(existingEnrollment);

      const result = await service.enrollUser(userId, courseId);

      expect(result).toEqual({
        enrollment: existingEnrollment,
        status: 'active',
      });
      expect(mockEnrollmentGet).toHaveBeenCalledWith(userId, courseId);
      expect(mockCourseGet).not.toHaveBeenCalled();
    });

    it('should throw error if course not found', async () => {
      mockEnrollmentGet.mockResolvedValue(undefined);
      mockCourseGet.mockResolvedValue(undefined);

      await expect(service.enrollUser(userId, courseId)).rejects.toThrow(
        `Course not found: ${courseId}`
      );

      expect(mockEnrollmentGet).toHaveBeenCalledWith(userId, courseId);
      expect(mockCourseGet).toHaveBeenCalledWith(courseId);
    });

    it('should enroll user in free course using FreeEnrollmentStrategy', async () => {
      const freeCourse: Course = {
        courseId,
        name: 'Free Course',
        description: 'A free course',
        instructor: 'Test Instructor',
        pricingModel: 'free',
        imageUrl: 'https://example.com/image.jpg',
        learningObjectives: ['Learn stuff'],
        curriculum: [],
      };

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

      mockEnrollmentGet.mockResolvedValue(undefined);
      mockCourseGet.mockResolvedValue(freeCourse);
      mockStrategyEnroll.mockResolvedValue(enrollmentResult);

      const result = await service.enrollUser(userId, courseId);

      expect(result).toEqual(enrollmentResult);
      expect(mockEnrollmentGet).toHaveBeenCalledWith(userId, courseId);
      expect(mockCourseGet).toHaveBeenCalledWith(courseId);
      expect(mockStrategyEnroll).toHaveBeenCalledWith(userId, courseId);
    });

    it('should throw error for unsupported pricing model', async () => {
      const paidCourse: Course = {
        courseId,
        name: 'Paid Course',
        description: 'A paid course',
        instructor: 'Test Instructor',
        pricingModel: 'paid',
        price: 99.99,
        imageUrl: 'https://example.com/image.jpg',
        learningObjectives: ['Learn stuff'],
        curriculum: [],
      };

      mockEnrollmentGet.mockResolvedValue(undefined);
      mockCourseGet.mockResolvedValue(paidCourse);

      await expect(service.enrollUser(userId, courseId)).rejects.toThrow(
        `Unsupported pricing model: paid`
      );

      expect(mockEnrollmentGet).toHaveBeenCalledWith(userId, courseId);
      expect(mockCourseGet).toHaveBeenCalledWith(courseId);
    });
  });

  describe('checkEnrollment', () => {
    const userId = 'user-123';
    const courseId = 'course-456';

    it('should return true if enrollment exists and payment is completed', async () => {
      const enrollment: Enrollment = {
        userId,
        courseId,
        enrollmentType: 'free',
        enrolledAt: '2025-01-01T00:00:00Z',
        paymentStatus: 'free',
        progress: 0,
        completed: false,
      };

      mockEnrollmentGet.mockResolvedValue(enrollment);

      const result = await service.checkEnrollment(userId, courseId);

      expect(result).toBe(true);
      expect(mockEnrollmentGet).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return false if enrollment does not exist', async () => {
      mockEnrollmentGet.mockResolvedValue(undefined);

      const result = await service.checkEnrollment(userId, courseId);

      expect(result).toBe(false);
      expect(mockEnrollmentGet).toHaveBeenCalledWith(userId, courseId);
    });

    it('should return false if enrollment exists but payment is pending', async () => {
      const enrollment: Enrollment = {
        userId,
        courseId,
        enrollmentType: 'paid',
        enrolledAt: '2025-01-01T00:00:00Z',
        paymentStatus: 'pending',
        progress: 0,
        completed: false,
      };

      mockEnrollmentGet.mockResolvedValue(enrollment);

      const result = await service.checkEnrollment(userId, courseId);

      expect(result).toBe(false);
      expect(mockEnrollmentGet).toHaveBeenCalledWith(userId, courseId);
    });
  });

  describe('getUserEnrollments', () => {
    const userId = 'user-123';

    it('should return all user enrollments', async () => {
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

      mockEnrollmentGetUserEnrollments.mockResolvedValue(enrollments);

      const result = await service.getUserEnrollments(userId);

      expect(result).toEqual(enrollments);
      expect(mockEnrollmentGetUserEnrollments).toHaveBeenCalledWith(userId);
    });

    it('should return empty array if user has no enrollments', async () => {
      mockEnrollmentGetUserEnrollments.mockResolvedValue([]);

      const result = await service.getUserEnrollments(userId);

      expect(result).toEqual([]);
      expect(mockEnrollmentGetUserEnrollments).toHaveBeenCalledWith(userId);
    });
  });
});
