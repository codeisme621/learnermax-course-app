import { enrollmentRepository } from './enrollment.repository.js';
import { courseRepository } from '../courses/course.repository.js';
import { FreeEnrollmentStrategy } from './strategies/free-enrollment.strategy.js';
import { createLogger } from '../../lib/logger.js';
import type { EnrollmentResult } from './enrollment.types.js';

const logger = createLogger('EnrollmentService');

export class EnrollmentService {
  async enrollUser(userId: string, courseId: string): Promise<EnrollmentResult> {
    // Idempotency check
    const existing = await enrollmentRepository.get(userId, courseId);
    if (existing) {
      logger.info('User already enrolled', { userId, courseId });
      return {
        enrollment: existing,
        status: 'active'
      };
    }

    const course = await courseRepository.get(courseId);
    if (!course) {
      throw new Error(`Course not found: ${courseId}`);
    }

    // Strategy selection (extensible for paid/bundle)
    if (course.pricingModel === 'free') {
      const strategy = new FreeEnrollmentStrategy();
      return await strategy.enroll(userId, courseId);
    }

    throw new Error(`Unsupported pricing model: ${course.pricingModel}`);
  }

  async checkEnrollment(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await enrollmentRepository.get(userId, courseId);
    return enrollment !== undefined && enrollment.paymentStatus !== 'pending';
  }

  async getUserEnrollments(userId: string) {
    return await enrollmentRepository.getUserEnrollments(userId);
  }
}

export const enrollmentService = new EnrollmentService();
