import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../client';
import { lessons, purchases, user } from '../schema';

// Test-only data builders. They write rows directly where the owning feature has no public
// API for it yet (e.g. purchases before checkout exists) — never imported by app code.

export function uniqueEmail(label = 'buyer'): string {
  return `${label}+${randomUUID().slice(0, 8)}@example.test`;
}

export async function insertPaidPurchase(a: { userId: string; email: string; courseId?: string }): Promise<string> {
  const [row] = await db
    .insert(purchases)
    .values({
      email: a.email,
      userId: a.userId,
      courseId: a.courseId ?? 'agentic-coding',
      amountCents: 39900,
      currency: 'usd',
      status: 'paid',
      paidAt: new Date(),
    })
    .returning({ id: purchases.id });
  return row.id;
}

export async function insertLessons(courseId: string, ids: string[]): Promise<void> {
  await db
    .insert(lessons)
    .values(ids.map((lessonId, i) => ({ courseId, lessonId, title: `Lesson ${i + 1}`, order: i + 1 })))
    .onConflictDoNothing();
}

export async function deleteLessons(courseId: string): Promise<void> {
  await db.delete(lessons).where(eq(lessons.courseId, courseId));
}

export async function findUser(email: string) {
  const [row] = await db.select().from(user).where(eq(user.email, email.toLowerCase()));
  return row;
}

/** A throwaway course so lesson/progress tests never change the seeded Agentic Coding course. */
export async function insertTestCourse(lessonIds: string[]): Promise<string> {
  const { courses } = await import('../schema');
  const id = `test-course-${randomUUID().slice(0, 8)}`;
  await db.insert(courses).values({
    id,
    name: 'Test Course',
    description: 'For tests',
    instructor: 'Test',
    imageUrl: '/x.jpg',
    priceCents: 1000,
  });
  await insertLessons(id, lessonIds);
  return id;
}
