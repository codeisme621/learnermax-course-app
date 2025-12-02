import type { Meetup } from './meetups.types.js';

/**
 * Hardcoded meetups for MVP
 * Future: Replace with database-driven meetups via admin UI
 */
export const MEETUPS: Meetup[] = [
  {
    meetupId: 'spec-driven-dev-weekly',
    title: 'Spec Driven Development & Context Engineering',
    description:
      'Weekly discussion on spec-driven workflows, context engineering, best practices, and Q&A. Join us to learn how to write effective specs that guide implementation and craft effective prompts for better AI interactions.',
    schedule: {
      dayOfWeek: 6, // Saturday (0 = Sunday, 6 = Saturday)
      hour: 10, // 10 AM
      minute: 0,
      timezone: 'America/Chicago', // CST/CDT
    },
    duration: 60, // minutes
    zoomLink: 'https://zoom.us/j/XXXXXXXXXX',
    hostName: 'Rico Martinez',
    hostEmail: 'rico@learnermax.com',
  },
];
