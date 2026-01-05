// NOT cached - user-specific data
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface ProgressData {
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;
  totalLessons: number;
  updatedAt: string;
}

/**
 * Get progress for a specific course
 * NOT cached - user-specific data
 * Used to determine lastAccessedLesson for resume functionality
 */
export async function getProgress(
  token: string,
  courseId: string
): Promise<ProgressData | null> {
  try {
    const response = await fetch(`${API_URL}/api/progress/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
