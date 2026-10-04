import type { Executor } from '@/platform/db/client';
import { ForbiddenError } from '@/platform/errors';
import { requireSession, type Session } from '@/features/accounts';
import * as repo from './enrollment.repo';
import type { CourseAccess, EnrollmentDTO } from './enrollment.types';

export async function getCourseAccess(userId: string, courseId: string): Promise<CourseAccess> {
  const row = await repo.findActive(userId, courseId);
  return { courseId, status: row ? 'active' : 'none' };
}

export async function listEnrollments(userId: string): Promise<EnrollmentDTO[]> {
  const rows = await repo.listActive(userId);
  return rows.map((row) => ({ courseId: row.courseId, status: 'active', enrolledAt: row.enrolledAt.toISOString() }));
}

/** Signed in AND actively enrolled in this course. Read from Postgres on every call — never cached. */
export async function requireCourseAccess(courseId: string): Promise<Session> {
  const session = await requireSession();
  const access = await getCourseAccess(session.user.id, courseId);
  if (access.status !== 'active') {
    throw new ForbiddenError('Not enrolled in this course');
  }
  return session;
}

/** Signed in AND actively enrolled in at least one course: the members' area (dashboard) gate. */
export async function requireAnyEnrollment(): Promise<Session> {
  const session = await requireSession();
  const active = await repo.listActive(session.user.id);
  if (active.length === 0) {
    throw new ForbiddenError('No active enrollment');
  }
  return session;
}

export function grant(ex: Executor, a: { userId: string; courseId: string; purchaseId: string }): Promise<void> {
  return repo.upsertActive(ex, a);
}

/** Revoke only enrollments backed by this purchase; a later repurchase is left alone. */
export async function revokeForPurchase(ex: Executor, purchaseId: string): Promise<void> {
  await repo.revokeByPurchase(ex, purchaseId);
}
