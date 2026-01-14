/**
 * Fetch functions for SWR hooks
 * These are called client-side and must handle authentication via API routes
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Base fetcher that handles errors and returns JSON
 * Used by SWR hooks for client-side data fetching
 */
async function baseFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include', // Include cookies for session auth
  });

  if (!response.ok) {
    const error = new Error('Failed to fetch');
    (error as Error & { status: number }).status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Fetch current student profile via API route
 * Returns null if not authenticated
 */
export async function fetchStudent(): Promise<{
  studentId: string;
  userId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  interestedInPremium?: boolean;
  premiumInterestDate?: string;
  signedUpMeetups?: string[];
} | null> {
  try {
    return await baseFetcher('/api/student');
  } catch (error) {
    if ((error as Error & { status: number }).status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch user's enrollments via API route
 * Returns empty array if not authenticated
 */
export async function fetchEnrollments(): Promise<
  Array<{
    userId: string;
    courseId: string;
    enrollmentType: 'free' | 'paid';
    enrolledAt: string;
    paymentStatus: 'free' | 'pending' | 'completed' | 'failed';
    progress: number;
    completed: boolean;
  }>
> {
  try {
    return await baseFetcher('/api/enrollments');
  } catch (error) {
    if ((error as Error & { status: number }).status === 401) {
      return [];
    }
    throw error;
  }
}

/**
 * Fetch progress for a specific course via API route
 * Returns null if not authenticated or not enrolled
 */
export async function fetchProgress(courseId: string): Promise<{
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;
  totalLessons: number;
  updatedAt: string;
} | null> {
  try {
    return await baseFetcher(`/api/progress/${courseId}`);
  } catch (error) {
    if ((error as Error & { status: number }).status === 401) {
      return null;
    }
    if ((error as Error & { status: number }).status === 403) {
      return null; // Not enrolled
    }
    throw error;
  }
}

// Export API URL for direct use if needed
export { API_URL };
