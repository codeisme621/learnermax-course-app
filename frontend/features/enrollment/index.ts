export {
  getCourseAccess,
  listEnrollments,
  requireCourseAccess,
  requireAnyEnrollment,
  grant,
  revokeForPurchase,
} from './enrollment.service';
export type { CourseAccess, EnrollmentDTO } from './enrollment.types';
