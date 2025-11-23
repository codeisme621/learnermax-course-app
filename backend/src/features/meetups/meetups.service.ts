import { DateTime } from 'luxon';
import { createLogger } from '../../lib/logger.js';
import { MEETUPS } from './meetups.constants.js';
import { meetupsRepository } from './meetups.repository.js';
import type {
  Meetup,
  MeetupSchedule,
  MeetupResponse,
} from './meetups.types.js';

const logger = createLogger('MeetupsService');

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
    userId: string,
    meetupId: string,
    userEmail: string,
    userName: string
  ): Promise<void> {
    logger.info('[signupForMeetup] Processing signup', {
      userId,
      meetupId,
      userEmail,
    });

    const meetup = MEETUPS.find((m) => m.meetupId === meetupId);
    if (!meetup) {
      logger.warn('[signupForMeetup] Meetup not found', { meetupId });
      throw new Error('Meetup not found');
    }

    // Create signup record (idempotent)
    try {
      await meetupsRepository.createSignup(userId, meetupId);
      logger.info('[signupForMeetup] Signup created', { userId, meetupId });
    } catch (error: any) {
      // If already exists, that's fine (idempotent)
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('[signupForMeetup] Already signed up (idempotent)', {
          userId,
          meetupId,
        });
        // Continue to send calendar invite (they may have lost it)
      } else {
        throw error;
      }
    }

    // Send calendar invite (deferred - log intent only)
    await this.sendCalendarInvite(meetup, userEmail, userName);
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
   * Send calendar invite via email
   * MVP: Log intent only (email integration deferred)
   */
  private async sendCalendarInvite(
    meetup: Meetup,
    userEmail: string,
    userName: string
  ): Promise<void> {
    const nextOccurrence = this.getNextOccurrence(meetup.schedule);

    logger.info('[sendCalendarInvite] Calendar invite intent (deferred)', {
      to: userEmail,
      userName,
      meetupTitle: meetup.title,
      nextOccurrence: nextOccurrence.toISO(),
    });

    // Future: Invoke email Lambda with calendar event
    // await emailService.sendMeetupInvite({
    //   to: userEmail,
    //   userName,
    //   meetup,
    //   nextOccurrence
    // });
  }
}

// Export singleton instance
export const meetupsService = new MeetupsService();
