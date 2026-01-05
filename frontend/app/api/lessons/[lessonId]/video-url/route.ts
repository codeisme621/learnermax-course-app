import { NextResponse } from 'next/server';
import { getAuthToken } from '@/app/actions/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface RouteParams {
  params: Promise<{ lessonId: string }>;
}

/**
 * GET /api/lessons/[lessonId]/video-url
 * Proxy to backend /api/lessons/:lessonId/video-url
 * Returns signed CloudFront URL with expiration
 * Used by SWR hooks for client-side data fetching with auto-refresh
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { lessonId } = await params;
    const token = await getAuthToken();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_URL}/api/lessons/${lessonId}/video-url`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store', // Never cache video URLs - they expire
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const videoUrlResponse = await response.json();
    return NextResponse.json(videoUrlResponse);
  } catch (error) {
    console.error('[API /api/lessons/[lessonId]/video-url] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
