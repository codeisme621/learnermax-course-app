/**
 * ProgressResponse - API response for student's course progress
 * Returned when frontend requests progress for a specific course
 */
export interface ProgressResponse {
  courseId: string;           // "spec-driven-dev-mini"
  completedLessons: string[]; // ["lesson-1", "lesson-2", "lesson-3"]
  lastAccessedLesson?: string; // "lesson-3" (for "Resume" button)
  percentage: number;         // 60 (calculated: 3/5 * 100)
  totalLessons: number;       // 5 (total lessons in course, for UI progress bar)
  updatedAt: string;          // "2025-01-15T10:30:00Z" (last progress update)
}
