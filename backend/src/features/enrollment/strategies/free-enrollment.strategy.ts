import type { EnrollmentStrategy } from './enrollment-strategy.interface.js';
import type { EnrollmentResult, EnrollmentCompletedEvent } from '../enrollment.types.js';
import { enrollmentRepository } from '../enrollment.repository.js';
import { createLogger } from '../../../lib/logger.js';
import { createMetrics, MetricUnit } from '../../../lib/metrics.js';
import { getSnsClient, PublishCommand } from '../../../lib/sns.js';

const logger = createLogger('FreeEnrollmentStrategy');
const metrics = createMetrics('LearnerMax/Backend', 'FreeEnrollmentStrategy');

export class FreeEnrollmentStrategy implements EnrollmentStrategy {
  async enroll(userId: string, courseId: string): Promise<EnrollmentResult> {
    const now = new Date().toISOString();
    const enrollment = {
      userId,
      courseId,
      enrollmentType: 'free' as const,
      enrolledAt: now,
      paymentStatus: 'free' as const,
      progress: 0,
      completed: false
    };

    // 1. Create enrollment record in EducationTable
    await enrollmentRepository.create(enrollment);

    logger.info('Free enrollment completed', { userId, courseId });

    // 2. Publish SNS event (fire-and-forget, don't block enrollment)
    await this.publishEnrollmentEvent(userId, courseId, now);

    return {
      enrollment,
      status: 'active'
    };
  }

  private async publishEnrollmentEvent(
    studentId: string,
    courseId: string,
    enrolledAt: string
  ): Promise<void> {
    const topicArn = process.env.TRANSACTIONAL_EMAIL_TOPIC_ARN;

    if (!topicArn) {
      logger.warn('TRANSACTIONAL_EMAIL_TOPIC_ARN not configured, skipping email event');
      return;
    }

    try {
      const event: EnrollmentCompletedEvent = {
        eventType: 'EnrollmentCompleted',
        studentId,
        courseId,
        enrollmentType: 'free',
        enrolledAt
      };

      await getSnsClient().send(new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(event),
        Subject: 'Enrollment Completed'
      }));

      logger.info('Enrollment event published to SNS', { studentId, courseId });
      metrics.addMetric('EnrollmentEventPublished', MetricUnit.Count, 1);
    } catch (error) {
      // Log but don't fail enrollment - email is non-critical
      logger.error('Failed to publish enrollment event', {
        error: error instanceof Error ? error.message : String(error),
        studentId,
        courseId
      });
      metrics.addMetric('EnrollmentEventPublishFailed', MetricUnit.Count, 1);
    }
  }
}
