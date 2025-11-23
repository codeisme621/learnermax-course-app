'use server';

import { getAuthToken } from './auth';

function getApiUrl(): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!API_URL) {
    console.error('[getApiUrl] NEXT_PUBLIC_API_URL environment variable is not set');
    throw new Error('API URL not configured. Please contact support.');
  }
  return API_URL;
}

/**
 * Student record with early access fields
 */
export interface Student {
  studentId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  interestedInPremium?: boolean;
  premiumInterestDate?: string;
}

/**
 * Result type for early access signup
 */
export interface EarlyAccessResult {
  success: boolean;
  message?: string;
  student?: Partial<Student>;
  error?: string;
}

/**
 * Sign up for early access to a premium course
 *
 * @param courseId - The ID of the premium course
 * @returns EarlyAccessResult with success status and student data
 */
export async function signUpForEarlyAccess(courseId: string): Promise<EarlyAccessResult> {
  console.log('[signUpForEarlyAccess] Starting signup for courseId:', courseId);

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[signUpForEarlyAccess] No auth token available');
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    console.log('[signUpForEarlyAccess] ID token obtained, length:', token.length);
    const apiUrl = getApiUrl();
    const endpoint = `${apiUrl}/api/students/early-access`;
    console.log('[signUpForEarlyAccess] Calling endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ courseId }),
    });

    console.log('[signUpForEarlyAccess] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[signUpForEarlyAccess] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      return {
        success: false,
        error: errorData.error || `Failed to sign up: ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log('[signUpForEarlyAccess] Signup successful:', data);

    return {
      success: true,
      message: data.message,
      student: data.student,
    };
  } catch (error) {
    console.error('[signUpForEarlyAccess] Exception occurred:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
