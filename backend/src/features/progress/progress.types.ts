/**
 * DynamoDB Progress Entity
 *
 * Access Pattern:
 * Get student's progress for a course:
 *   Query: PK = "STUDENT#<studentId>" AND SK = "PROGRESS#<courseId>"
 */
export interface ProgressEntity {
  // DynamoDB Keys
  PK: string;              // "STUDENT#<studentId>"
  SK: string;              // "PROGRESS#<courseId>"

  // Progress Data
  studentId: string;       // "student-123"
  courseId: string;        // "spec-driven-dev-mini"
  completedLessons: string[]; // ["lesson-1", "lesson-2", "lesson-3"]
  lastAccessedLesson?: string; // "lesson-3" (for "Resume" functionality)
  percentage: number;      // 60 (calculated: completedLessons.length / totalLessons * 100)

  // Timestamp
  updatedAt: string;       // ISO timestamp (last progress update)
}

/**
 * Progress API Response Type
 * Frontend-facing type returned by progress endpoints
 */
export interface ProgressResponse {
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;
  totalLessons: number;    // For frontend to calculate progress bar
  updatedAt: string;
}
