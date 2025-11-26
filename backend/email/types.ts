// SNS Event Types
export interface EnrollmentCompletedEvent {
  eventType: 'EnrollmentCompleted';
  studentId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid';
  enrolledAt: string;
  source: 'manual' | 'auto';
}

export interface MeetupSignupCompletedEvent {
  eventType: 'MeetupSignupCompleted';
  studentId: string;
  studentEmail: string;
  studentName: string;
  meetupId: string;
  signedUpAt: string;
  source: 'manual' | 'auto';
}

export type TransactionalEmailEvent =
  | EnrollmentCompletedEvent
  | MeetupSignupCompletedEvent;

// Email Template Data Types
export interface EnrollmentEmailData {
  studentName: string;           // "Alex Johnson"
  studentEmail: string;          // "alex@example.com"
  courseName: string;            // "Spec-Driven Development with Context Engineering"
  courseUrl: string;             // "https://learnermax.com/course/spec-driven-dev-mini"
  courseDescription: string;     // Brief course description
  instructor: string;            // "Rico Romero"
  totalLessons: number;          // 3
  estimatedDuration: string;     // "45 minutes"
  enrolledAt: string;            // "January 15, 2025" (formatted)
  pricingModel: 'free' | 'paid';
}

export interface MeetupCalendarInviteEmailData {
  studentName: string;           // "Alex Johnson"
  studentEmail: string;          // "alex@example.com"
  meetupTitle: string;           // "Spec Driven Development & Context Engineering"
  meetupDescription: string;     // Meetup description from constants
  formattedDateTime: string;     // "Saturday, January 18, 2025 at 10:00 AM CST"
  duration: number;              // 60 (minutes)
  zoomLink: string;              // "https://zoom.us/j/XXXXXXXXXX"
  hostName: string;              // "Rico Martinez"
}

// ICS Calendar File Generation Data
export interface MeetupEventData {
  meetupTitle: string;
  meetupDescription: string;
  nextOccurrence: string;  // ISO timestamp
  duration: number;         // minutes
  zoomLink: string;
  hostName: string;
  hostEmail: string;
  studentName: string;
  studentEmail: string;
}
