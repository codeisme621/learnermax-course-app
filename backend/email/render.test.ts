import { describe, test, expect } from 'vitest';
import { renderEmailFromEvent } from './render';
import type { EnrollmentEmailData, MeetupCalendarInviteEmailData } from './types';

describe('renderEmailFromEvent', () => {
  const mockEnrollmentData: EnrollmentEmailData = {
    studentName: 'Alex Johnson',
    studentEmail: 'alex@example.com',
    courseName: 'Spec-Driven Development with Context Engineering',
    courseUrl: 'https://learnermax.com/course/spec-driven-dev-mini',
    courseDescription: 'Learn how to build better software with AI collaboration.',
    instructor: 'Rico Romero',
    totalLessons: 3,
    estimatedDuration: '45 minutes',
    enrolledAt: 'January 15, 2025',
    pricingModel: 'free',
  };

  const mockMeetupData: MeetupCalendarInviteEmailData = {
    studentName: 'Alex Johnson',
    studentEmail: 'alex@example.com',
    meetupTitle: 'Spec Driven Development & Context Engineering',
    meetupDescription: 'Weekly discussion on spec-driven workflows.',
    formattedDateTime: 'Saturday, January 18, 2025 at 10:00 AM CST',
    duration: 60,
    zoomLink: 'https://zoom.us/j/123456789',
    hostName: 'Rico Romero',
  };

  test('renderEmailFromEvent_EnrollmentCompleted_returnsHtmlAndSubject', async () => {
    const result = await renderEmailFromEvent('EnrollmentCompleted', mockEnrollmentData);

    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('subject');
    expect(typeof result.html).toBe('string');
    expect(typeof result.subject).toBe('string');
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.subject).toContain('Spec-Driven Development with Context Engineering');
    expect(result.subject).toContain('Welcome');

    // Verify HTML contains key elements
    expect(result.html).toContain('Alex Johnson');
    expect(result.html).toContain('Start Learning');
    expect(result.html).toContain(mockEnrollmentData.courseUrl);
    expect(result.html).toContain('Rico Romero');
  });

  test('renderEmailFromEvent_MeetupSignupCompleted_returnsHtmlAndSubject', async () => {
    const result = await renderEmailFromEvent('MeetupSignupCompleted', mockMeetupData);

    expect(result).toHaveProperty('html');
    expect(result).toHaveProperty('subject');
    expect(typeof result.html).toBe('string');
    expect(typeof result.subject).toBe('string');
    expect(result.html.length).toBeGreaterThan(0);
    expect(result.subject).toContain('Spec Driven Development & Context Engineering');
    expect(result.subject).toContain('Signed Up');

    // Verify HTML contains key elements
    expect(result.html).toContain('Alex Johnson');
    expect(result.html).toContain('Saturday, January 18, 2025 at 10:00 AM CST');
    expect(result.html).toContain('https://zoom.us/j/123456789');
    expect(result.html).toContain('Rico Romero');
  });

  test('renderEmailFromEvent_unknownEventType_throwsError', async () => {
    await expect(
      renderEmailFromEvent('InvalidEventType', mockEnrollmentData)
    ).rejects.toThrow('Unknown email event type: InvalidEventType');
  });

  test('renderEmailFromEvent_EnrollmentCompleted_htmlIsValid', async () => {
    const result = await renderEmailFromEvent('EnrollmentCompleted', mockEnrollmentData);

    // Verify basic HTML structure
    expect(result.html).toContain('<!DOCTYPE');
    expect(result.html).toContain('<html');
    expect(result.html).toContain('<body');
    expect(result.html).toContain('</body>');
    expect(result.html).toContain('</html>');
  });

  test('renderEmailFromEvent_MeetupSignupCompleted_htmlIsValid', async () => {
    const result = await renderEmailFromEvent('MeetupSignupCompleted', mockMeetupData);

    // Verify basic HTML structure
    expect(result.html).toContain('<!DOCTYPE');
    expect(result.html).toContain('<html');
    expect(result.html).toContain('<body');
    expect(result.html).toContain('</body>');
    expect(result.html).toContain('</html>');
  });
});
