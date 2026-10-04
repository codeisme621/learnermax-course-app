import { NotFoundError } from '@/platform/errors';
import { listLessons } from '@/features/courses';
import * as repo from './progress.repo';
import type { ProgressRow } from './progress.repo';
import type { ProgressDTO } from './progress.types';

// Callers must check course access first (enrollment.requireCourseAccess).

function toDTO(courseId: string, lessonIds: string[], row: ProgressRow | undefined): ProgressDTO {
  const completed = (row?.completedLessonIds ?? []).filter((id) => lessonIds.includes(id));
  const totalLessons = lessonIds.length;
  return {
    courseId,
    completedLessons: completed,
    ...(row?.lastAccessedLessonId ? { lastAccessedLesson: row.lastAccessedLessonId } : {}),
    percentage: totalLessons === 0 ? 0 : Math.round((completed.length / totalLessons) * 100),
    totalLessons,
    updatedAt: (row?.updatedAt ?? new Date()).toISOString(),
  };
}

async function lessonIdsOf(courseId: string): Promise<string[]> {
  const { lessons } = await listLessons(courseId);
  return lessons.map((l) => l.lessonId);
}

async function requireLessonInCourse(courseId: string, lessonId: string): Promise<string[]> {
  const ids = await lessonIdsOf(courseId);
  if (!ids.includes(lessonId)) {
    throw new NotFoundError('Lesson not found in this course');
  }
  return ids;
}

export async function getProgress(userId: string, courseId: string): Promise<ProgressDTO> {
  const [ids, row] = await Promise.all([lessonIdsOf(courseId), repo.find(userId, courseId)]);
  return toDTO(courseId, ids, row);
}

export async function markLessonComplete(userId: string, courseId: string, lessonId: string): Promise<ProgressDTO> {
  const ids = await requireLessonInCourse(courseId, lessonId);
  const row = await repo.addCompleted(userId, courseId, lessonId);
  return toDTO(courseId, ids, row);
}

export async function trackLessonAccess(userId: string, courseId: string, lessonId: string): Promise<void> {
  await requireLessonInCourse(courseId, lessonId);
  await repo.setLastAccessed(userId, courseId, lessonId);
}
