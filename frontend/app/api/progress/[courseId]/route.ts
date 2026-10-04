import { NextResponse } from 'next/server';
import { requireCourseAccess } from '@/features/enrollment';
import { getProgress } from '@/features/progress';
import { handle } from '@/platform/http';

export function GET(_req: Request, ctx: RouteContext<'/api/progress/[courseId]'>) {
  return handle(async () => {
    const { courseId } = await ctx.params;
    const { user } = await requireCourseAccess(courseId);
    return NextResponse.json(await getProgress(user.id, courseId));
  });
}
