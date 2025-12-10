import { SNSEvent, SNSHandler } from 'aws-lambda';
import { createLogger } from './lib/logger.js';
import { createMetrics, MetricUnit } from './lib/metrics.js';
import { prepareEnrollmentEmailData, prepareMeetupEmailData } from './data-service.js';
import { sendEmail } from './ses-service.js';
import { renderEmailFromEvent } from './render.js';
import { generateMeetupIcs } from './utils/generate-ics.js';
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
        });

        // 1. Fetch student and course data from DynamoDB
        const emailData = await prepareEnrollmentEmailData(emailEvent);

        logger.info('Enrollment email data prepared', {
          studentEmail: emailData.studentEmail,
          courseName: emailData.courseName,
        });

        // 2. Render enrollment email template
        const { html, subject } = await renderEmailFromEvent(
          emailEvent.eventType,
          emailData
        );

        logger.info('Enrollment email rendered', {
          subject,
          htmlLength: html.length,
        });

        // 3. Send email via SES
        await sendEmail({
          to: emailData.studentEmail,
          subject,
          html,
        });

        logger.info('Enrollment email sent successfully', {
          studentId: emailEvent.studentId,
          courseId: emailEvent.courseId,
          studentEmail: emailData.studentEmail,
        });

        metrics.addMetric('EnrollmentEmailSent', MetricUnit.Count, 1);
      } else if (emailEvent.eventType === 'MeetupSignupCompleted') {
        logger.info('Processing meetup calendar invite email', {
          studentId: emailEvent.studentId,
          meetupId: emailEvent.meetupId,
          studentEmail: emailEvent.studentEmail,
        });

        // 1. Prepare meetup email data from constants
        const { emailData, eventData } = prepareMeetupEmailData(emailEvent);

        logger.info('Meetup email data prepared', {
          meetupTitle: emailData.meetupTitle,
          formattedDateTime: emailData.formattedDateTime,
        });

        // 2. Generate .ics calendar file
        const icsBuffer = generateMeetupIcs(eventData);

        logger.info('ICS calendar file generated', {
          icsSize: icsBuffer.length,
        });

        // 3. Render meetup calendar invite email template
        const { html, subject } = await renderEmailFromEvent(
          emailEvent.eventType,
          emailData
        );

        logger.info('Meetup email rendered', {
          subject,
          htmlLength: html.length,
        });

        // 4. Send email via SES with .ics attachment
        await sendEmail({
          to: emailData.studentEmail,
          subject,
          html,
          attachments: [
            {
              filename: `meetup-${emailEvent.meetupId}.ics`,
              content: icsBuffer,
              contentType: 'text/calendar; charset=utf-8; method=REQUEST',
              isCalendarInvite: true, // Triggers Gmail/Outlook interactive calendar UI
            },
          ],
        });

        logger.info('Meetup calendar invite email sent successfully', {
          studentId: emailEvent.studentId,
          meetupId: emailEvent.meetupId,
          studentEmail: emailData.studentEmail,
        });

        metrics.addMetric('MeetupEmailSent', MetricUnit.Count, 1);
      } else {
        logger.warn('Unknown event type', {
          eventType: (emailEvent as unknown as { eventType: string }).eventType,
        });
      }
    } catch (error) {
      logger.error('Failed to process email event', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        record: record.Sns.Message,
      });

      metrics.addMetric('EmailSendFailed', MetricUnit.Count, 1);

      // Don't throw - we don't want to retry and spam emails
      // Log error for monitoring and alerting
    }
  }

  metrics.publishStoredMetrics();
};
