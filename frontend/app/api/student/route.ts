import { NextResponse } from 'next/server';
import { getAuthToken } from '@/app/actions/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * GET /api/student
 * Proxy to backend /api/students/me
 * Used by SWR hooks for client-side data fetching
 */
export async function GET() {
  try {
    const token = await getAuthToken();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${API_URL}/api/students/me`, {
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

    const student = await response.json();
    return NextResponse.json(student);
  } catch (error) {
    console.error('[API /api/student] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
