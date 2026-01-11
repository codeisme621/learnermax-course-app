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
import { getToken } from 'next-auth/jwt';
import { auth } from '@/lib/auth';

// Environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || ''; // e.g., .learnwithrico.com
const VIDEO_CDN_DOMAIN = process.env.NEXT_PUBLIC_VIDEO_CDN_DOMAIN || ''; // e.g., video.learnwithrico.com

/**
 * Handle video access for course pages.
 * Sets CloudFront signed cookies if user is enrolled.
 *
 * @returns NextResponse with cookies if successful, null to continue to auth
 */
async function handleVideoAccess(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Only process course pages: /course/{courseId} or /course/{courseId}/lesson/{lessonId}
  const courseMatch = pathname.match(/^\/course\/([^/]+)/);
  if (!courseMatch) {
    return null; // Not a course page, skip
  }

  const courseId = courseMatch[1];

  // Check if CloudFront cookies already exist (session cookies persist until browser close)
  if (request.cookies.has('CloudFront-Policy')) {
    return null; // Already have cookies, skip
  }

  // Get the NextAuth JWT token which contains id_token
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (!token?.id_token) {
    // No session or no id_token, let auth middleware handle
    return null;
  }

  // Call backend to verify enrollment and get signed cookies
  try {
    const res = await fetch(`${API_URL}/api/courses/${courseId}/video-access`, {
      headers: {
        Authorization: `Bearer ${token.id_token}`,
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
export async function proxy(request: NextRequest) {
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
