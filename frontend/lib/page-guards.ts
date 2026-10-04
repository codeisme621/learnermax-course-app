import { redirect } from 'next/navigation';
import type { Session } from '@/features/accounts';
import { requireAnyEnrollment, requireCourseAccess } from '@/features/enrollment';
import { ForbiddenError, UnauthorizedError } from '@/platform/errors';

// Page-level wrappers: turn service auth errors into redirects.
// Signed out → /signin (then back here). Signed in without access → /checkout.

async function orRedirect(fn: () => Promise<Session>, returnTo: string, checkoutPath: string): Promise<Session> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect(`/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
    }
    if (error instanceof ForbiddenError) {
      redirect(checkoutPath);
    }
    throw error;
  }
}

export function pageRequireAnyEnrollment(returnTo: string): Promise<Session> {
  return orRedirect(requireAnyEnrollment, returnTo, '/checkout');
}

export function pageRequireCourseAccess(courseId: string): Promise<Session> {
  return orRedirect(() => requireCourseAccess(courseId), `/course/${courseId}`, `/checkout?course=${courseId}`);
}
