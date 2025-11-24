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
