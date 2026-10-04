'use server';

import { requireCourseAccess } from '@/features/enrollment';
import * as progress from '@/features/progress';
import type { ProgressDTO } from '@/features/progress';
import { actionError } from '@/platform/http';

export type ProgressResponse = ProgressDTO;

export async function markLessonComplete(courseId: string, lessonId: string): Promise<ProgressDTO | { error: string }> {
  try {
    const session = await requireCourseAccess(courseId);
    return await progress.markLessonComplete(session.user.id, courseId, lessonId);
  } catch (error) {
    return actionError(error);
  }
}

/** Fire-and-forget "resume here" marker; failures are logged, never surfaced. */
export async function trackLessonAccess(courseId: string, lessonId: string): Promise<void> {
  try {
    const session = await requireCourseAccess(courseId);
    await progress.trackLessonAccess(session.user.id, courseId, lessonId);
  } catch (error) {
    actionError(error);
  }
}
