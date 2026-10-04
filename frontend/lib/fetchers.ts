/**
 * SWR fetchers for the app's own same-origin API routes (Better Auth session cookie).
 */
import type { StudentDTO } from '@/features/students';
import type { EnrollmentDTO } from '@/features/enrollment';
import type { ProgressDTO } from '@/features/progress';

class FetchError extends Error {
  constructor(readonly status: number) {
    super(`Request failed with status ${status}`);
  }
}

async function baseFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) {
    throw new FetchError(response.status);
  }
  return response.json();
}

function statusOf(error: unknown): number | undefined {
  return error instanceof FetchError ? error.status : undefined;
}

export async function fetchStudent(): Promise<StudentDTO | null> {
  try {
    return await baseFetcher<StudentDTO>('/api/students/me');
  } catch (error) {
    if (statusOf(error) === 401) return null;
    throw error;
  }
}

export async function fetchEnrollments(): Promise<EnrollmentDTO[]> {
  try {
    return await baseFetcher<EnrollmentDTO[]>('/api/enrollments');
  } catch (error) {
    if (statusOf(error) === 401) return [];
    throw error;
  }
}

export async function fetchProgress(courseId: string): Promise<ProgressDTO | null> {
  try {
    return await baseFetcher<ProgressDTO>(`/api/progress/${courseId}`);
  } catch (error) {
    const status = statusOf(error);
    if (status === 401 || status === 403) return null; // signed out / not enrolled
    throw error;
  }
}
