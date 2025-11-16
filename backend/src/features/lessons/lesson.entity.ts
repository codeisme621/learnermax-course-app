/**
 * LessonEntity - DynamoDB persistence model
 * Stores lessons using single-table design with PK/SK pattern
 *
 * Access Patterns:
 * 1. Get all lessons for a course: Query PK="COURSE#<courseId>" AND SK begins_with "LESSON#"
 * 2. Get specific lesson: Query GSI1PK="LESSON#<lessonId>"
 *
 * Example:
 * PK: "COURSE#spec-driven-dev-mini"
 * SK: "LESSON#lesson-1"
 * GSI1PK: "LESSON#lesson-1"
 * GSI1SK: "COURSE#spec-driven-dev-mini"
 */
export interface LessonEntity {
  // DynamoDB Keys
  PK: string;              // Partition key: "COURSE#spec-driven-dev-mini"
  SK: string;              // Sort key: "LESSON#lesson-1"
  GSI1PK?: string;         // GSI1 partition key: "LESSON#lesson-1" (for direct lesson lookup)
  GSI1SK?: string;         // GSI1 sort key: "COURSE#spec-driven-dev-mini" (for reverse index)
  entityType?: string;     // Optional: "LESSON" (used for filtering in queries)

  // Lesson Data (matches domain model + extras)
  lessonId: string;        // "lesson-1"
  courseId: string;        // "spec-driven-dev-mini"
  title: string;           // "Introduction to Spec-Driven Development"
  description?: string;    // Optional: "In this lesson, you'll learn..."
  videoKey: string;        // "courses/spec-driven-dev-mini/lesson-1.mp4"
  lengthInMins?: number;   // Optional: 15 (can be derived from video metadata later)
  thumbnailKey?: string;   // Optional: "courses/spec-driven-dev-mini/thumbnails/lesson-1.jpg"
  order: number;           // 1, 2, 3, 4, 5 (determines display order)

  // Timestamps
  createdAt?: string;      // ISO 8601: "2025-01-15T10:30:00Z"
  updatedAt?: string;      // ISO 8601: "2025-01-15T10:30:00Z"
}
