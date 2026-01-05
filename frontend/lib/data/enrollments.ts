// NOT cached - user-specific data, use SWR client-side

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Re-export types from actions for compatibility
export type { Enrollment, EnrollmentResult } from '@/app/actions/enrollments';

/**
 * Check if the current user is enrolled in a specific course
 * NOT cached - user-specific data
 *
 * @param token - Auth token
 * @param courseId - The ID of the course to check
 * @returns true if enrolled, false otherwise
 */
export async function checkEnrollment(token: string, courseId: string): Promise<boolean> {
  console.log('[checkEnrollment] Checking enrollment for courseId:', courseId);

  try {
    const endpoint = `${API_URL}/api/enrollments/check/${courseId}`;
    console.log('[checkEnrollment] Calling endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    console.log('[checkEnrollment] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[checkEnrollment] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return false;
    }

    const data = await response.json();
    const enrolled = data.enrolled === true;
    console.log('[checkEnrollment] Enrollment check result:', enrolled);
    return enrolled;
  } catch (error) {
    console.error('[checkEnrollment] Exception occurred:', error);
    return false;
  }
}
