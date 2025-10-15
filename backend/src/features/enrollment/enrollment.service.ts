import { enrollmentRepository } from './enrollment.repository.js';
import { courseRepository } from '../courses/course.repository.js';
import { FreeEnrollmentStrategy } from './strategies/free-enrollment.strategy.js';
import { createLogger } from '../../lib/logger.js';
import type { EnrollmentResult } from './enrollment.types.js';

const logger = createLogger('EnrollmentService');

export class EnrollmentService {
  async enrollUser(userId: string, courseId: string): Promise<EnrollmentResult> {
    logger.info('[enrollUser] Starting enrollment process', { userId, courseId });

    // Idempotency check
    logger.info('[enrollUser] Checking for existing enrollment', { userId, courseId });
    const existing = await enrollmentRepository.get(userId, courseId);
    if (existing) {
      logger.info('[enrollUser] User already enrolled - returning existing enrollment', {
        userId,
        courseId,
        enrollmentType: existing.enrollmentType,
        paymentStatus: existing.paymentStatus
      });
      return {
        enrollment: existing,
        status: 'active'
      };
    }

    logger.info('[enrollUser] No existing enrollment found - fetching course', { userId, courseId });
    const course = await courseRepository.get(courseId);
    if (!course) {
      logger.error('[enrollUser] Course not found', { userId, courseId });
      throw new Error(`Course not found: ${courseId}`);
    }

    logger.info('[enrollUser] Course found', {
      userId,
      courseId,
      courseName: course.name,
      pricingModel: course.pricingModel
    });

    // Strategy selection (extensible for paid/bundle)
    if (course.pricingModel === 'free') {
      logger.info('[enrollUser] Using free enrollment strategy', { userId, courseId });
      const strategy = new FreeEnrollmentStrategy();
      const result = await strategy.enroll(userId, courseId);
      logger.info('[enrollUser] Enrollment completed successfully', {
        userId,
        courseId,
        status: result.status,
        enrollmentType: result.enrollment?.enrollmentType
      });
      return result;
    }

    logger.error('[enrollUser] Unsupported pricing model', {
      userId,
      courseId,
      pricingModel: course.pricingModel
    });
    throw new Error(`Unsupported pricing model: ${course.pricingModel}`);
  }

  async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    logger.info('[checkEnrollment] Checking enrollment status', { userId, courseId });
    const enrollment = await enrollmentRepository.get(userId, courseId);
    const enrolled = enrollment !== undefined && enrollment.paymentStatus !== 'pending';
    logger.info('[checkEnrollment] Check result', {
      userId,
      courseId,
      enrolled,
      enrollmentFound: !!enrollment,
      paymentStatus: enrollment?.paymentStatus
    });
    return enrolled;
  }

  async getUserEnrollments(userId: string) {
    logger.info('[getUserEnrollments] Fetching user enrollments', { userId });
    const enrollments = await enrollmentRepository.getUserEnrollments(userId);
    logger.info('[getUserEnrollments] Result', {
      userId,
      count: enrollments.length,
      courseIds: enrollments.map(e => e.courseId)
    });
    return enrollments;
  }
}

export const enrollmentService = new EnrollmentService();
