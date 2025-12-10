import { render } from '@react-email/render';
import EnrollmentEmail from './emails/enrollment-email.js';
import MeetupCalendarInviteEmail from './emails/meetup-calendar-invite-email.js';
import type { EnrollmentEmailData, MeetupCalendarInviteEmailData } from './types.js';

/**
 * Render email HTML from SNS event type and data
 * This is the main entry point for the Lambda handler
 */
export async function renderEmailFromEvent(
  eventType: string,
  data: EnrollmentEmailData | MeetupCalendarInviteEmailData
): Promise<{ html: string; subject: string }> {
  switch (eventType) {
    case 'EnrollmentCompleted':
      return renderEnrollmentEmail(data as EnrollmentEmailData);

    case 'MeetupSignupCompleted':
      return renderMeetupCalendarInviteEmail(data as MeetupCalendarInviteEmailData);

    // Future email types can be added here:
    // case 'CourseCompleted':
    //   return renderCourseCompletionEmail(data);
    // case 'ProgressMilestone':
    //   return renderProgressReminderEmail(data);

    default:
      throw new Error(`Unknown email event type: ${eventType}`);
  }
}

/**
 * Render enrollment email
 */
async function renderEnrollmentEmail(
  data: EnrollmentEmailData
): Promise<{ html: string; subject: string }> {
  const html = await render(EnrollmentEmail(data), {
    pretty: false,
  });

  const subject = `Welcome to ${data.courseName} - Let's Get Started!`;

  return { html, subject };
}

/**
 * Render meetup calendar invite email
 */
async function renderMeetupCalendarInviteEmail(
  data: MeetupCalendarInviteEmailData
): Promise<{ html: string; subject: string }> {
  const html = await render(MeetupCalendarInviteEmail(data), {
    pretty: false,
  });

  const subject = `You're Signed Up for ${data.meetupTitle} - Calendar Invite Attached`;

  return { html, subject };
}
