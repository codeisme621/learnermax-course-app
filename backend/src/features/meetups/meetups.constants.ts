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
      "Join us weekly as we break down real specs, troubleshoot AI workflows, and explore best practices in Spec-Driven Development & context engineering. It's an open collaborative environment where you can ask questions, refine your approach, and learn from fellow builders.",
    schedule: {
      dayOfWeek: 6, // Saturday (0 = Sunday, 6 = Saturday)
      hour: 10, // 10 AM
      minute: 0,
      timezone: 'America/Chicago', // CST/CDT
    },
    duration: 60, // minutes
    zoomLink: 'https://zoom.us/j/XXXXXXXXXX',
    hostName: 'Rico Romero',
    hostEmail: 'rico@learnermax.com',
  },
];
