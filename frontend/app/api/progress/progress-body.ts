import { ValidationError } from '@/platform/errors';

/** `{ courseId, lessonId }`, both non-empty strings — the Express API's rule and error text. */
export async function readProgressBody(req: Request): Promise<{ courseId: string; lessonId: string }> {
  const body = await req.json().catch(() => null);
  if (typeof body?.courseId !== 'string' || !body.courseId || typeof body?.lessonId !== 'string' || !body.lessonId) {
    throw new ValidationError('Missing or invalid courseId or lessonId');
  }
  return { courseId: body.courseId, lessonId: body.lessonId };
}
