import type { EnrollmentResult } from '../enrollment.types.js';

export interface EnrollmentStrategy {
  enroll(userId: string, courseId: string): Promise<EnrollmentResult>;
}
