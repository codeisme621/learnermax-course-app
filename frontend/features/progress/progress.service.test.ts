import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@/platform/errors';
import { insertTestCourse, uniqueEmail } from '@/platform/db/testing/fixtures';
import { provisionBuyer } from '@/features/accounts';
import { getProgress, markLessonComplete, trackLessonAccess } from '@/features/progress';

async function setup() {
  const courseId = await insertTestCourse(['lesson-1', 'lesson-2', 'lesson-3']);
  const { userId } = await provisionBuyer(uniqueEmail());
  return { courseId, userId };
}

describe('progress (real Postgres)', () => {
  it('starts empty with the live lesson count', async () => {
    const { courseId, userId } = await setup();
    expect(await getProgress(userId, courseId)).toEqual({
      courseId,
      completedLessons: [],
      percentage: 0,
      totalLessons: 3,
      updatedAt: expect.any(String),
    });
  });

  it('records completions once, computes percentage, and resumes at the last lesson', async () => {
    const { courseId, userId } = await setup();
    await markLessonComplete(userId, courseId, 'lesson-1');
    await markLessonComplete(userId, courseId, 'lesson-1');
    const progress = await markLessonComplete(userId, courseId, 'lesson-2');

    expect(progress).toMatchObject({ completedLessons: ['lesson-1', 'lesson-2'], lastAccessedLesson: 'lesson-2', percentage: 67 });
  });

  it('is safe under concurrent completions', async () => {
    const { courseId, userId } = await setup();
    await Promise.all(['lesson-1', 'lesson-2', 'lesson-3', 'lesson-1'].map((l) => markLessonComplete(userId, courseId, l)));
    const progress = await getProgress(userId, courseId);
    expect([...progress.completedLessons].sort()).toEqual(['lesson-1', 'lesson-2', 'lesson-3']);
    expect(progress.percentage).toBe(100);
  });

  it('tracks last access without completing', async () => {
    const { courseId, userId } = await setup();
    await trackLessonAccess(userId, courseId, 'lesson-3');
    expect(await getProgress(userId, courseId)).toMatchObject({ completedLessons: [], lastAccessedLesson: 'lesson-3' });
  });

  it('rejects a lesson that does not belong to the course', async () => {
    const { courseId, userId } = await setup();
    await expect(markLessonComplete(userId, courseId, 'lesson-99')).rejects.toBeInstanceOf(NotFoundError);
    await expect(trackLessonAccess(userId, courseId, 'lesson-99')).rejects.toBeInstanceOf(NotFoundError);
  });
});
