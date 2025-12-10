import { DateTime } from 'luxon';
import { createLogger } from '../../lib/logger.js';
import { createMetrics, MetricUnit } from '../../lib/metrics.js';
import { getSnsClient, PublishCommand } from '../../lib/sns.js';
import { MEETUPS } from './meetups.constants.js';
import { meetupsRepository } from './meetups.repository.js';
import type {
  Meetup,
  MeetupSchedule,
  MeetupResponse,
  MeetupSignupCompletedEvent,
} from './meetups.types.js';

const logger = createLogger('MeetupsService');
const metrics = createMetrics('LearnerMax/Backend', 'MeetupsService');

export class MeetupsService {
  /**
   * Get all meetups with user signup status
   */
  async getMeetups(userId: string): Promise<MeetupResponse[]> {
    logger.info('[getMeetups] Fetching meetups for user', {
      userId,
      meetupCount: MEETUPS.length,
    });

    // Get all user signups
    const signups = await meetupsRepository.getStudentSignups(userId);
    const signupMap = new Map(signups.map((s) => [s.meetupId, s]));

    // Map hardcoded meetups to responses
    const responses = MEETUPS.map((meetup) => {
      const nextOccurrence = this.getNextOccurrence(meetup.schedule);
      const isRunning = this.isCurrentlyRunning(
        meetup.schedule,
        meetup.duration
      );
      const isSignedUp = signupMap.has(meetup.meetupId);

      return {
        meetupId: meetup.meetupId,
        title: meetup.title,
        description: meetup.description,
        nextOccurrence: nextOccurrence.toISO()!,
        isRunning,
        isSignedUp,
        zoomLink: isRunning ? meetup.zoomLink : undefined, // Only expose if running
        duration: meetup.duration,
        hostName: meetup.hostName,
      };
    });

    logger.info('[getMeetups] Meetups retrieved', {
      userId,
      count: responses.length,
    });

    return responses;
  }

  /**
   * Sign up for a meetup and send calendar invite
   */
  async signupForMeetup(
    studentId: string,
    meetupId: string,
    studentEmail: string,
    studentName: string
  ): Promise<void> {
    logger.info('[signupForMeetup] Processing signup', {
      studentId,
      meetupId,
      studentEmail,
    });

    const meetup = MEETUPS.find((m) => m.meetupId === meetupId);
    if (!meetup) {
      logger.warn('[signupForMeetup] Meetup not found', { meetupId });
      throw new Error('Meetup not found');
    }

    // Create signup record (idempotent)
    try {
      await meetupsRepository.createSignup(studentId, meetupId);
      logger.info('[signupForMeetup] Signup created', { studentId, meetupId });
    } catch (error: any) {
      // If already exists, that's fine (idempotent)
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('[signupForMeetup] Already signed up (idempotent)', {
          studentId,
          meetupId,
        });
        // Continue to send calendar invite (they may have lost it)
      } else {
        throw error;
      }
    }

    // Publish SNS event to trigger calendar invite email
    await this.publishMeetupSignupEvent(meetup, studentId, studentEmail, studentName);
  }

  /**
   * Calculate next occurrence of a recurring meetup
   */
  private getNextOccurrence(schedule: MeetupSchedule): DateTime {
    const now = DateTime.now().setZone(schedule.timezone);
    let next = now.set({
      hour: schedule.hour,
      minute: schedule.minute,
      second: 0,
      millisecond: 0,
    });

    // Find next occurrence of the target day of week
    // Luxon uses 1-7 for weekday (1=Monday, 7=Sunday)
    // Our schedule uses 0-6 (0=Sunday, 6=Saturday)
    // Convert: schedule.dayOfWeek === 0 ? 7 : schedule.dayOfWeek
    const targetWeekday = schedule.dayOfWeek === 0 ? 7 : schedule.dayOfWeek;

    while (next.weekday !== targetWeekday || next <= now) {
      next = next.plus({ days: 1 });
    }

    return next;
  }

  /**
   * Check if meetup is currently running (time-based)
   * Strict window: exactly between start and end time
   */
  private isCurrentlyRunning(
    schedule: MeetupSchedule,
    duration: number
  ): boolean {
    const now = DateTime.now().setZone(schedule.timezone);
    const meetingStart = now.set({
      hour: schedule.hour,
      minute: schedule.minute,
      second: 0,
    });
    const meetingEnd = meetingStart.plus({ minutes: duration });

    // Meeting is running if:
    // 1. Today is the meeting day
    // 2. Current time is between start and end
    const targetWeekday = schedule.dayOfWeek === 0 ? 7 : schedule.dayOfWeek;
    return (
      now.weekday === targetWeekday && now >= meetingStart && now <= meetingEnd
    );
  }

  /**
   * Publish meetup signup event to SNS for calendar invite email
   */
  private async publishMeetupSignupEvent(
    meetup: Meetup,
    studentId: string,
    studentEmail: string,
    studentName: string
  ): Promise<void> {
    const topicArn = process.env.TRANSACTIONAL_EMAIL_TOPIC_ARN;

    if (!topicArn) {
      logger.warn('[publishMeetupSignupEvent] TRANSACTIONAL_EMAIL_TOPIC_ARN not configured, skipping email');
      return;
    }

    try {
      const event: MeetupSignupCompletedEvent = {
        eventType: 'MeetupSignupCompleted',
        studentId,
        studentEmail,
        studentName,
        meetupId: meetup.meetupId,
        signedUpAt: new Date().toISOString(),
      };

      await getSnsClient().send(new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(event),
        Subject: 'Meetup Signup Completed',
      }));

      logger.info('[publishMeetupSignupEvent] Meetup signup event published', {
        studentId,
        meetupId: meetup.meetupId,
        studentEmail,
      });

      metrics.addMetric('MeetupSignupEventPublished', MetricUnit.Count, 1);
    } catch (error) {
      // Log but don't fail signup - email is non-critical
      logger.error('[publishMeetupSignupEvent] Failed to publish meetup signup event', {
        error: error instanceof Error ? error.message : String(error),
        studentId,
        meetupId: meetup.meetupId,
        studentEmail,
      });

      metrics.addMetric('MeetupSignupEventPublishFailed', MetricUnit.Count, 1);
    }
  }
}

// Export singleton instance
export const meetupsService = new MeetupsService();
