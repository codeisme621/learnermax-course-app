import { NextResponse } from 'next/server';
import { getCourse } from '@/features/courses';
import { handle } from '@/platform/http';

export function GET(_req: Request, ctx: RouteContext<'/api/courses/[courseId]'>) {
  return handle(async () => {
    const { courseId } = await ctx.params;
    return NextResponse.json(await getCourse(courseId));
  });
}
