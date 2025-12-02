export interface Enrollment {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid' | 'bundle';
  enrolledAt: string;
  paymentStatus: 'free' | 'pending' | 'completed';
  stripeSessionId?: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
}

export interface EnrollmentResult {
  enrollment?: Enrollment;
  checkoutUrl?: string;
  status: 'active' | 'pending';
}

// SNS Event Type (published after enrollment)
export interface EnrollmentCompletedEvent {
  eventType: 'EnrollmentCompleted';
  studentId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid';
  enrolledAt: string;
}
