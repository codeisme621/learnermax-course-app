import { createEvent, EventAttributes, DateArray } from 'ics';
import { DateTime } from 'luxon';
import type { MeetupEventData } from '../types.js';

export function generateMeetupIcs(data: MeetupEventData): Buffer {
  const startDateTime = DateTime.fromISO(data.nextOccurrence);

  // Convert to DateArray format: [year, month, day, hour, minute]
  const start: DateArray = [
    startDateTime.year,
    startDateTime.month,
    startDateTime.day,
    startDateTime.hour,
    startDateTime.minute,
  ];

  const event: EventAttributes = {
    start,
    duration: { minutes: data.duration },
    title: data.meetupTitle,
    description: `${data.meetupDescription}\n\nZoom Link: ${data.zoomLink}`,
    location: data.zoomLink,
    url: data.zoomLink,
    organizer: {
      name: data.hostName,
      email: data.hostEmail,
    },
    attendees: [
      {
        name: data.studentName,
        email: data.studentEmail,
        rsvp: true,
        partstat: 'NEEDS-ACTION',
        role: 'REQ-PARTICIPANT',
      },
    ],
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
    method: 'REQUEST',
  };

  const { error, value } = createEvent(event);

  if (error) {
    console.error('Failed to generate ICS file', { error, data });
    throw new Error(`ICS generation failed: ${error.message}`);
  }

  if (!value) {
    throw new Error('ICS generation returned no value');
  }

  return Buffer.from(value, 'utf-8');
}
