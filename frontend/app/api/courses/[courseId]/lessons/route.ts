import { NextResponse } from 'next/server';
import { listLessons } from '@/features/courses';
import { requireCourseAccess } from '@/features/enrollment';
import { handle } from '@/platform/http';

export function GET(_req: Request, ctx: RouteContext<'/api/courses/[courseId]/lessons'>) {
  return handle(async () => {
    const { courseId } = await ctx.params;
    await requireCourseAccess(courseId);
    return NextResponse.json(await listLessons(courseId));
  });
}
