'use server';

import { getAuthToken } from './auth';

function getApiUrl(): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!API_URL) {
    console.error('[getApiUrl] NEXT_PUBLIC_API_URL environment variable is not set');
    console.error('[getApiUrl] Please set it in your .env.local file');
    throw new Error('API URL not configured. Please contact support.');
  }
  return API_URL;
}

/**
 * Enrollment record returned from backend API
 */
export interface Enrollment {
  userId: string;
  courseId: string;
  enrollmentType: 'free' | 'paid';
  enrolledAt: string; // ISO date string
  paymentStatus: 'free' | 'pending' | 'completed' | 'failed';
  progress: number; // 0-100
  completed: boolean;
}

/**
 * Result type for enrollment operations
 */
export interface EnrollmentResult {
  success: boolean;
  enrollment?: Enrollment;
  status?: 'active' | 'pending';
  error?: string;
}

/**
 * Enroll the current user in a course
 *
 * @param courseId - The ID of the course to enroll in
 * @returns EnrollmentResult with enrollment data or error
 */
export async function enrollInCourse(courseId: string): Promise<EnrollmentResult> {
  console.log('[enrollInCourse] Starting enrollment for courseId:', courseId);

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[enrollInCourse] No auth token available');
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    console.log('[enrollInCourse] ID token obtained, length:', token.length);
    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/enrollments`;
    console.log('[enrollInCourse] Calling endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId }),
    });

    console.log('[enrollInCourse] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[enrollInCourse] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      return {
        success: false,
        error: errorData.error || `Failed to enroll: ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log('[enrollInCourse] Enrollment successful:', data);

    return {
      success: true,
      enrollment: data.enrollment,
      status: data.status,
    };
  } catch (error) {
    console.error('[enrollInCourse] Exception occurred:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

