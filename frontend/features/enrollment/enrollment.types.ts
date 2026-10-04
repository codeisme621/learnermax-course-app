// REST contract for GET /api/enrollments (slimmed: only active enrollments are returned).
export interface EnrollmentDTO {
  courseId: string;
  status: 'active';
  enrolledAt: string;
}

export interface CourseAccess {
  courseId: string;
  status: 'active' | 'none';
}
