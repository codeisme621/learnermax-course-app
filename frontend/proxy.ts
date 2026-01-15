/**
 * Next.js Proxy (formerly Middleware)
 *
 * In Next.js 16+, the middleware function is renamed to 'proxy'.
 * This file must export a single function named 'proxy'.
 *
 * Handles two concerns:
 * 1. Video Access: Sets CloudFront signed cookies for course pages
 * 2. Authentication: NextAuth proxy for protected routes
 *
 * The video access logic runs first for /course/* routes, then falls through
 * to the NextAuth proxy for authentication handling.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getAuthToken } from '@/app/actions/auth';

// Environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || ''; // e.g., .learnwithrico.com

/**
 * Handle video access for course pages.
 * Sets CloudFront signed cookies if user is enrolled.
 *
 * Uses the established auth() pattern from the codebase to get the session,
 * matching how getAuthToken() works in server actions.
 *
 * @returns NextResponse with cookies if successful, null to continue to auth
 */
async function handleVideoAccess(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  console.log('[VideoAccess] Processing request:', pathname);

  // Only process course pages: /course/{courseId} or /course/{courseId}/lesson/{lessonId}
  const courseMatch = pathname.match(/^\/course\/([^/]+)/);
  if (!courseMatch) {
    return null; // Not a course page, skip
  }

  const courseId = courseMatch[1];
  console.log('[VideoAccess] Course page detected:', courseId);

  // Check if CloudFront cookies already exist (session cookies persist until browser close)
  if (request.cookies.has('CloudFront-Policy')) {
    console.log('[VideoAccess] CloudFront cookies exist, skipping');
    return null; // Already have cookies, skip
  }

  // Get auth token using the established pattern from server actions
  console.log('[VideoAccess] Getting auth token...');
  const token = await getAuthToken();
  console.log('[VideoAccess] Token result:', !!token);

  if (!token) {
    // No session or no id_token, let auth middleware handle redirect
    console.log('[VideoAccess] No auth token, skipping video access check');
    return null;
  }

  // Call backend to verify enrollment and get signed cookies
  try {
    const res = await fetch(`${API_URL}/api/courses/${courseId}/video-access`, {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      // Not enrolled or error - let page handle the redirect
      console.log(`[VideoAccess] Backend returned ${res.status} for course ${courseId}`);
      return null;
    }

    const data = await res.json();

    if (!data.success || !data.cookies) {
      console.error('[VideoAccess] Invalid response from backend:', data);
      return null;
    }

    // Create response with cookies set
    const response = NextResponse.next();

    // Cookie options for CloudFront signed cookies
    // - httpOnly: true - Prevents XSS from reading cookies
    // - secure: true - HTTPS only
    // - sameSite: 'none' - Cross-origin (CDN domain differs from app domain)
    // - path: '/' - Browser sends for all paths
    // - domain: shared domain for app and CDN subdomains
    // - No maxAge/expires = session cookie (deleted on browser close)
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'none' | 'lax' | 'strict';
      path: string;
      domain?: string;
    } = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      path: '/',
    };

    // Only set domain if configured (needed for cross-subdomain cookies)
    if (COOKIE_DOMAIN) {
      cookieOptions.domain = COOKIE_DOMAIN;
    }

    response.cookies.set('CloudFront-Policy', data.cookies['CloudFront-Policy'], cookieOptions);
    response.cookies.set('CloudFront-Signature', data.cookies['CloudFront-Signature'], cookieOptions);
    response.cookies.set('CloudFront-Key-Pair-Id', data.cookies['CloudFront-Key-Pair-Id'], cookieOptions);

    console.log(`[VideoAccess] Set CloudFront cookies for course ${courseId}`);

    return response;
  } catch (error) {
    console.error('[VideoAccess] Failed to get video access cookies:', error);
    return null; // Continue without cookies, video may fail to load
  }
}

/**
 * Combined proxy: video access + auth
 *
 * In Next.js 16+, the middleware function is renamed to 'proxy'.
 * This is the single exported function that handles all proxy logic.
 *
 * Order of operations:
 * 1. Try to set video access cookies for course pages
 * 2. Fall through to NextAuth proxy for auth handling
 */
export default async function proxy(request: NextRequest) {
  // Try to set video access cookies first (for course pages only)
  const videoResponse = await handleVideoAccess(request);
  if (videoResponse) {
    return videoResponse;
  }

  // Fall through to NextAuth proxy for auth handling
  // This handles:
  // - Redirecting unauthenticated users away from protected routes
  // - Redirecting authenticated users away from auth pages
  return auth(request as any);
}

export const config = {
  // Match all routes except static files and API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
