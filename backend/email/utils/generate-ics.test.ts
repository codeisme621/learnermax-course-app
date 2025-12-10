import { describe, test, expect } from 'vitest';
import { generateMeetupIcs } from './generate-ics.js';
import type { MeetupEventData } from '../types.js';

describe('generateMeetupIcs', () => {
  const mockMeetupData: MeetupEventData = {
    meetupTitle: 'Spec Driven Development & Context Engineering',
    meetupDescription: 'Weekly discussion on spec-driven workflows and context engineering.',
    nextOccurrence: '2025-01-18T16:00:00.000Z',
    duration: 60,
    zoomLink: 'https://zoom.us/j/123456789',
    hostName: 'Rico Romero',
    hostEmail: 'rico@learnermax.com',
    studentName: 'Alex Johnson',
    studentEmail: 'alex@example.com',
  };

  test('generateMeetupIcs_validData_returnsBuffer', () => {
    const result = generateMeetupIcs(mockMeetupData);

    expect(result).toBeInstanceOf(Buffer);
    const icsContent = result.toString('utf-8');
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('END:VCALENDAR');
    expect(icsContent).toContain('BEGIN:VEVENT');
    expect(icsContent).toContain('END:VEVENT');
  });

  test('generateMeetupIcs_includesZoomLinkInLocation', () => {
    const result = generateMeetupIcs(mockMeetupData);
    const icsContent = result.toString('utf-8');

    expect(icsContent).toContain('LOCATION:https://zoom.us/j/123456789');
    expect(icsContent).toContain('URL:https://zoom.us/j/123456789');
  });

  test('generateMeetupIcs_setsOrganizerCorrectly', () => {
    const result = generateMeetupIcs(mockMeetupData);
    const icsContent = result.toString('utf-8');

    expect(icsContent).toContain('ORGANIZER');
    expect(icsContent).toContain('rico@learnermax.com');
    expect(icsContent).toContain('Rico Romero');
  });

  test('generateMeetupIcs_setsAttendeeWithRsvpTrue', () => {
    const result = generateMeetupIcs(mockMeetupData);
    const icsContent = result.toString('utf-8');

    expect(icsContent).toContain('ATTENDEE');
    expect(icsContent).toContain('alex@example.com');
    expect(icsContent).toContain('RSVP=TRUE');
    expect(icsContent).toContain('PARTSTAT="NEEDS-ACTION"');
  });

  test('generateMeetupIcs_calculatesStartTimeFromISO', () => {
    const result = generateMeetupIcs(mockMeetupData);
    const icsContent = result.toString('utf-8');

    // ISO: 2025-01-18T16:00:00.000Z
    // Should convert to: 20250118T160000Z (UTC format)
    expect(icsContent).toContain('DTSTART:20250118T160000Z');
  });

  test('generateMeetupIcs_includesDuration', () => {
    const result = generateMeetupIcs(mockMeetupData);
    const icsContent = result.toString('utf-8');

    // Duration should be in ISO 8601 format: PT60M for 60 minutes
    expect(icsContent).toContain('DURATION:PT60M');
  });

  test('generateMeetupIcs_includesMeetupTitle', () => {
    const result = generateMeetupIcs(mockMeetupData);
    const icsContent = result.toString('utf-8');

    expect(icsContent).toContain('SUMMARY:Spec Driven Development & Context Engineering');
  });

  test('generateMeetupIcs_includesDescriptionWithZoomLink', () => {
    const result = generateMeetupIcs(mockMeetupData);
    const icsContent = result.toString('utf-8');

    expect(icsContent).toContain('DESCRIPTION:');
    expect(icsContent).toContain('Weekly discussion on spec-driven workflows');
    expect(icsContent).toContain('https://zoom.us/j/123456789');
  });
});
