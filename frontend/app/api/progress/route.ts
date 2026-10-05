import { NextResponse } from 'next/server';
import { requireCourseAccess } from '@/features/enrollment';
import { markLessonComplete } from '@/features/progress';
import { handle } from '@/platform/http';
import { readProgressBody } from './progress-body';

export function POST(req: Request) {
  return handle(async () => {
    const { courseId, lessonId } = await readProgressBody(req);
    const { user } = await requireCourseAccess(courseId);
    return NextResponse.json(await markLessonComplete(user.id, courseId, lessonId));
  });
}
