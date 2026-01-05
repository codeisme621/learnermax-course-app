export { auth as middleware } from '@/lib/auth';

export function proxy() {}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
