import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DateTime } from 'luxon';
import { MEETUPS } from './constants/meetups.constants.js';
import type { MeetupSchedule } from './constants/meetups.types.js';
import type {
  EnrollmentCompletedEvent,
  MeetupSignupCompletedEvent,
  EnrollmentEmailData,
  MeetupCalendarInviteEmailData,
  MeetupEventData,
} from './types.js';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;
const FRONTEND_DOMAIN = process.env.FRONTEND_DOMAIN!;
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL!;

interface StudentData {
  userId: string;
  name: string;
  email: string;
}

interface CourseData {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  totalLessons: number;
  estimatedDuration: string;
  pricingModel: 'free' | 'paid';
}

/**
 * Fetch student data from DynamoDB
 */
async function getStudent(studentId: string): Promise<StudentData> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${studentId}`,
        SK: 'METADATA',
      },
    })
  );

  if (!result.Item) {
    throw new Error(`Student not found: ${studentId}`);
  }

  return {
    userId: result.Item.userId,
    name: result.Item.name,
    email: result.Item.email,
  };
}

/**
 * Fetch course data from DynamoDB
 */
async function getCourse(courseId: string): Promise<CourseData> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `COURSE#${courseId}`,
        SK: 'METADATA',
      },
    })
  );

  if (!result.Item) {
    throw new Error(`Course not found: ${courseId}`);
  }

  return {
    courseId: result.Item.courseId,
    name: result.Item.name,
    description: result.Item.description,
    instructor: result.Item.instructor,
    totalLessons: result.Item.totalLessons,
    estimatedDuration: result.Item.estimatedDuration,
    pricingModel: result.Item.pricingModel,
  };
}

/**
 * Format enrollment date for display (e.g., "January 15, 2025")
 */
function formatEnrollmentDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate next occurrence of a recurring meetup
 * (Replicated from meetups.service.ts)
 */
function getNextOccurrence(schedule: MeetupSchedule): DateTime {
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
 * Format meetup datetime for display
 * (e.g., "Saturday, January 18, 2025 at 10:00 AM CST")
 */
function formatMeetupDateTime(nextOccurrence: DateTime, timezone: string): string {
  return nextOccurrence.setZone(timezone).toLocaleString({
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Prepare email data from enrollment event
 */
export async function prepareEnrollmentEmailData(
  event: EnrollmentCompletedEvent
): Promise<EnrollmentEmailData> {
  // Fetch student and course data in parallel
  const [student, course] = await Promise.all([
    getStudent(event.studentId),
    getCourse(event.courseId),
  ]);

  // Build course URL
  const courseUrl = `${FRONTEND_DOMAIN}/course/${course.courseId}`;

  // Format enrollment date
  const enrolledAt = formatEnrollmentDate(event.enrolledAt);

  return {
    studentName: student.name,
    studentEmail: student.email,
    courseName: course.name,
    courseUrl,
    courseDescription: course.description,
    instructor: course.instructor,
    totalLessons: course.totalLessons,
    estimatedDuration: course.estimatedDuration,
    enrolledAt,
    pricingModel: course.pricingModel,
  };
}

/**
 * Prepare email data from meetup signup event
 */
export function prepareMeetupEmailData(
  event: MeetupSignupCompletedEvent
): { emailData: MeetupCalendarInviteEmailData; eventData: MeetupEventData } {
  // Find meetup from constants
  const meetup = MEETUPS.find((m) => m.meetupId === event.meetupId);

  if (!meetup) {
    throw new Error(`Meetup not found: ${event.meetupId}`);
  }

  // Calculate next occurrence
  const nextOccurrence = getNextOccurrence(meetup.schedule);
  const formattedDateTime = formatMeetupDateTime(nextOccurrence, meetup.schedule.timezone);

  const emailData: MeetupCalendarInviteEmailData = {
    studentName: event.studentName,
    studentEmail: event.studentEmail,
    meetupTitle: meetup.title,
    meetupDescription: meetup.description,
    formattedDateTime,
    duration: meetup.duration,
    zoomLink: meetup.zoomLink,
    zoomMeetingId: meetup.zoomMeetingId,
    zoomPasscode: meetup.zoomPasscode,
    hostName: meetup.hostName,
  };

  const eventData: MeetupEventData = {
    meetupTitle: meetup.title,
    meetupDescription: meetup.description,
    nextOccurrence: nextOccurrence.toISO()!,
    duration: meetup.duration,
    zoomLink: meetup.zoomLink,
    hostName: meetup.hostName,
    // Use SES_FROM_EMAIL as organizer to match the FROM domain (required for Gmail calendar)
    hostEmail: SES_FROM_EMAIL,
    studentName: event.studentName,
    studentEmail: event.studentEmail,
  };

  return { emailData, eventData };
}
