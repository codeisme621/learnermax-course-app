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
