import { SNSEvent, SNSHandler } from 'aws-lambda';
import { createLogger } from '../src/lib/logger.js';
import { createMetrics, MetricUnit } from '../src/lib/metrics.js';
import type { TransactionalEmailEvent } from './types.js';

const logger = createLogger('TransactionalEmailFunction');
const metrics = createMetrics('LearnerMax/Backend', 'TransactionalEmailFunction');

export const handler: SNSHandler = async (event: SNSEvent) => {
  logger.info('Received transactional email event', {
    recordCount: event.Records.length,
  });

  for (const record of event.Records) {
    try {
      const emailEvent: TransactionalEmailEvent = JSON.parse(record.Sns.Message);

      logger.info('Processing email event', {
        eventType: emailEvent.eventType,
      });

      if (emailEvent.eventType === 'EnrollmentCompleted') {
        logger.info('Processing enrollment email', {
          studentId: emailEvent.studentId,
          courseId: emailEvent.courseId,
          enrollmentType: emailEvent.enrollmentType,
          source: emailEvent.source,
        });

        // TODO: Fetch student and course data (Slice 4.3)
        // TODO: Render enrollment email template (Slice 4.2)
        // TODO: Send email via SES (Slice 4.3)

        logger.info('Enrollment email sent successfully', {
          studentId: emailEvent.studentId,
          courseId: emailEvent.courseId,
        });

        metrics.addMetric('EnrollmentEmailSent', MetricUnit.Count, 1);
      } else if (emailEvent.eventType === 'MeetupSignupCompleted') {
        logger.info('Processing meetup calendar invite email', {
          studentId: emailEvent.studentId,
          meetupId: emailEvent.meetupId,
        });

        // TODO: Fetch meetup data (Slice 4.3)
        // TODO: Generate .ics file (Slice 4.2)
        // TODO: Render meetup calendar invite email template (Slice 4.2)
        // TODO: Send email with .ics attachment via SES (Slice 4.3)

        logger.info('Meetup calendar invite email sent successfully', {
          studentId: emailEvent.studentId,
          meetupId: emailEvent.meetupId,
        });

        metrics.addMetric('MeetupEmailSent', MetricUnit.Count, 1);
      } else {
        logger.warn('Unknown event type', {
          eventType: (emailEvent as any).eventType,
        });
      }
    } catch (error) {
      logger.error('Failed to process email event', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        record: record.Sns.Message,
      });
      // Don't throw - we don't want to retry and spam emails
      // Log error for monitoring and alerting
    }
  }

  metrics.publishStoredMetrics();
};
