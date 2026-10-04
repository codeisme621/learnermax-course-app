import { NextResponse } from 'next/server';
import { getSession } from '@/features/accounts';
import { AGENTIC_CODING_COURSE_ID } from '@/features/courses';
import { startCheckout } from '@/features/purchases';
import { handle } from '@/platform/http';

/**
 * POST { courseId?, email? } → { url } (Stripe Checkout) | { redirectTo: '/dashboard' }.
 * Only the course is chosen by the client; price, amount and buyer identity are server-owned.
 * A signed-in buyer always pays as their own account; `email` is ignored for them.
 */
export function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const courseId = typeof body?.courseId === 'string' ? body.courseId : AGENTIC_CODING_COURSE_ID;
    const session = await getSession();
    const result = session
      ? await startCheckout({ courseId, userId: session.user.id, email: session.user.email })
      : await startCheckout({ courseId, email: typeof body?.email === 'string' ? body.email : '' });
    return NextResponse.json(result.kind === 'redirect' ? { url: result.url } : { redirectTo: result.redirectTo });
  });
}
