import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { lessonProgress } from './progress.schema';

export type ProgressRow = typeof lessonProgress.$inferSelect;

export async function find(userId: string, courseId: string): Promise<ProgressRow | undefined> {
  const [row] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseId, courseId)));
  return row;
}

/** Atomically add a completed lesson (no duplicates) and mark it last accessed. */
export async function addCompleted(userId: string, courseId: string, lessonId: string): Promise<ProgressRow> {
  const [row] = await db
    .insert(lessonProgress)
    .values({ userId, courseId, completedLessonIds: [lessonId], lastAccessedLessonId: lessonId })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.courseId],
      set: {
        completedLessonIds: sql`CASE WHEN ${lessonProgress.completedLessonIds} @> ARRAY[${lessonId}]::text[]
          THEN ${lessonProgress.completedLessonIds}
          ELSE array_append(${lessonProgress.completedLessonIds}, ${lessonId}) END`,
        lastAccessedLessonId: lessonId,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function setLastAccessed(userId: string, courseId: string, lessonId: string): Promise<void> {
  await db
    .insert(lessonProgress)
    .values({ userId, courseId, lastAccessedLessonId: lessonId })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.courseId],
      set: { lastAccessedLessonId: lessonId, updatedAt: new Date() },
    });
}
