import { and, eq } from 'drizzle-orm';
import { db, type Executor } from '@/platform/db/client';
import { enrollments } from './enrollment.schema';

export type EnrollmentRow = typeof enrollments.$inferSelect;

export async function findActive(userId: string, courseId: string): Promise<EnrollmentRow | undefined> {
  const [row] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId), eq(enrollments.status, 'active')));
  return row;
}

export function listActive(userId: string): Promise<EnrollmentRow[]> {
  return db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'active')));
}

/**
 * Activate (or re-activate) the user's enrollment and point it at the backing purchase.
 * An already-active enrollment keeps its original purchase, so a second payment never
 * re-points access away from the first.
 */
export async function upsertActive(ex: Executor, a: { userId: string; courseId: string; purchaseId: string }): Promise<void> {
  await ex
    .insert(enrollments)
    .values({ ...a, status: 'active' })
    .onConflictDoUpdate({
      target: [enrollments.userId, enrollments.courseId],
      set: { status: 'active', purchaseId: a.purchaseId, enrolledAt: new Date(), revokedAt: null },
      setWhere: eq(enrollments.status, 'revoked'),
    });
}

export async function revokeByPurchase(ex: Executor, purchaseId: string): Promise<number> {
  const rows = await ex
    .update(enrollments)
    .set({ status: 'revoked', revokedAt: new Date() })
    .where(and(eq(enrollments.purchaseId, purchaseId), eq(enrollments.status, 'active')))
    .returning({ id: enrollments.id });
  return rows.length;
}
