import { NextResponse } from 'next/server';
import { getAuthToken } from '@/app/actions/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface RouteParams {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/progress/[courseId]
 * Proxy to backend /api/progress/:courseId
 * Used by SWR hooks for client-side data fetching
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { courseId } = await params;
    const token = await getAuthToken();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_URL}/api/progress/${courseId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const progress = await response.json();
    return NextResponse.json(progress);
  } catch (error) {
    console.error('[API /api/progress/[courseId]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
