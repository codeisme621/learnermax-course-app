/**
 * ProgressEntity - DynamoDB persistence model for student course progress
 * One item per student per course (NOT one item per lesson completion)
 *
 * Access Pattern:
 * Get student's progress for a course: Query PK="STUDENT#<studentId>" AND SK="PROGRESS#<courseId>"
 *
 * Example:
 * PK: "STUDENT#student-123"
 * SK: "PROGRESS#spec-driven-dev-mini"
 */
export interface ProgressEntity {
  // DynamoDB Keys
  PK: string;              // Partition key: "STUDENT#student-123"
  SK: string;              // Sort key: "PROGRESS#spec-driven-dev-mini"

  // Progress Data
  studentId: string;       // "student-123"
  courseId: string;        // "spec-driven-dev-mini"
  completedLessons: string[]; // ["lesson-1", "lesson-2"] - grows as student completes lessons
  lastAccessedLesson?: string; // "lesson-2" - updated every time student opens a lesson
  percentage: number;      // 40 - calculated: (2/5) * 100

  // Timestamps
  updatedAt: string;       // "2025-01-15T10:30:00Z" - updated on every progress save
}
