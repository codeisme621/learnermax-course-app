import { unstable_rethrow } from 'next/navigation';
import { NextResponse } from 'next/server';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from './errors';

/** Map a service error to the REST error contract: `{ error }` (plus `details` for validation). */
export function errorResponse(error: unknown): NextResponse {
  // Let Next.js control flow through (dynamic-rendering bailouts, redirect(), notFound()).
  unstable_rethrow(error);
  if (error instanceof UnauthorizedError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (error instanceof ForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
  }
  console.error('[api] Unhandled error', error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

/** Run a route handler body, converting thrown service errors into responses. */
export async function handle(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    return errorResponse(error);
  }
}

/** Server action results keep the `{ error }` shape the UI already understands. */
export function actionError(error: unknown): { error: string } {
  unstable_rethrow(error);
  if (error instanceof UnauthorizedError) return { error: 'Please sign in' };
  if (error instanceof ForbiddenError || error instanceof NotFoundError || error instanceof ValidationError) {
    return { error: error.message };
  }
  console.error('[action] Unhandled error', error);
  return { error: 'Something went wrong. Please try again.' };
}
