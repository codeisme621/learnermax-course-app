import { NextResponse } from 'next/server';
import { listCourses } from '@/features/courses';
import { handle } from '@/platform/http';

export function GET() {
  return handle(async () => NextResponse.json(await listCourses()));
}
