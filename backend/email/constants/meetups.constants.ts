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
    zoomLink: 'https://zoom.us/j/95804276890?pwd=qhb5WJdxazcBoNQn1SPNAWSAivxjqg.1',
    zoomMeetingId: '958 0427 6890',
    zoomPasscode: '140180',
    zoomIcsUrl: 'https://zoom.us/meeting/tJEld-2qqT0iE9Sm3xeAey0-D5u1FAcWmA6Y/ics?icsToken=DLfMM3U3jd6lY9zqpQAALAAAABBkTzOcjcfOekqYICaAn4G9MihFyfNIm2WJUA0-01e7PUdk5JK6aUZkW5A2xU-3pn-rLHaF34Vo3ybo5jAwMDAwMQ&meetingMasterEventId=PJ5FutmASj24vxVOQaAEYg',
    hostName: 'Rico Romero',
    hostEmail: 'rico@learnermax.com',
  },
];
