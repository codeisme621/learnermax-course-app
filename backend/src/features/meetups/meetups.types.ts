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

/**
 * MeetupSignupEntity - DynamoDB entity for tracking student signups
 */
export interface MeetupSignupEntity {
  PK: string; // "STUDENT#<userId>"
  SK: string; // "MEETUP_SIGNUP#<meetupId>"
  meetupId: string;
  signedUpAt: string; // ISO timestamp
  entityType: 'MEETUP_SIGNUP';
}

/**
 * MeetupResponse - API response for frontend consumption
 * Includes calculated fields like nextOccurrence and isRunning
 */
export interface MeetupResponse {
  meetupId: string;
  title: string;
  description: string;
  nextOccurrence: string; // ISO timestamp of next meeting
  isRunning: boolean; // Is the meeting happening right now?
  isSignedUp: boolean; // Has the user signed up?
  zoomLink?: string; // Only included if isRunning = true
  duration: number;
  hostName: string;
}
