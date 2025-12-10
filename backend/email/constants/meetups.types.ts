/**
 * Meetup - Core meetup configuration (hardcoded for MVP)
 */
export interface Meetup {
  meetupId: string;
  title: string;
  description: string;
  schedule: MeetupSchedule;
  duration: number; // minutes
  zoomLink: string;
  zoomMeetingId: string;
  zoomPasscode: string;
  zoomIcsUrl?: string; // Zoom-provided ICS URL for recurring meetings
  hostName: string;
  hostEmail: string;
}

/**
 * MeetupSchedule - Recurring weekly schedule configuration
 */
export interface MeetupSchedule {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  hour: number; // 0-23 (24-hour format)
  minute: number; // 0-59
  timezone: string; // IANA timezone (e.g., "America/Chicago")
}
