import { asc, count, eq } from 'drizzle-orm';
import { db } from '@/platform/db/client';
import { courses, lessons } from './courses.schema';

export type CourseRow = typeof courses.$inferSelect;

export async function findCourse(courseId: string): Promise<CourseRow | undefined> {
  const [row] = await db.select().from(courses).where(eq(courses.id, courseId));
  return row;
}

export function findAllCourses(): Promise<CourseRow[]> {
  return db.select().from(courses).orderBy(asc(courses.createdAt));
}

export async function countLessonsByCourse(): Promise<Map<string, number>> {
  const rows = await db
    .select({ courseId: lessons.courseId, total: count() })
    .from(lessons)
    .groupBy(lessons.courseId);
  return new Map(rows.map((r) => [r.courseId, r.total]));
}
