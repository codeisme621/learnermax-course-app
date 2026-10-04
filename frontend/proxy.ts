import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Optimistic redirect for signed-out visitors: only checks that a session cookie exists.
 * The real checks (valid session, paid enrollment) run on the server at every protected
 * page, action and route handler — never rely on this alone.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) {
    return NextResponse.next();
  }
  const signIn = new URL('/signin', request.url);
  signIn.searchParams.set('callbackUrl', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: ['/dashboard/:path*', '/course/:path*', '/activate'],
};
