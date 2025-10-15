import type { EnrollmentStrategy } from './enrollment-strategy.interface.js';
import type { EnrollmentResult } from '../enrollment.types.js';
import { enrollmentRepository } from '../enrollment.repository.js';
import { createLogger } from '../../../lib/logger.js';

const logger = createLogger('FreeEnrollmentStrategy');

export class FreeEnrollmentStrategy implements EnrollmentStrategy {
  async enroll(userId: string, courseId: string): Promise<EnrollmentResult> {
    const enrollment = {
      userId,
      courseId,
      enrollmentType: 'free' as const,
      enrolledAt: new Date().toISOString(),
      paymentStatus: 'free' as const,
      progress: 0,
      completed: false
    };

    // Create enrollment record in EducationTable
    await enrollmentRepository.create(enrollment);

    logger.info('Free enrollment completed', { userId, courseId });

    return {
      enrollment,
      status: 'active'
    };
  }
}
