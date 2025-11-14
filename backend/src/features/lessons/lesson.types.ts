import type { Lesson } from '../courses/course.types.js';

/**
 * DynamoDB Lesson Entity
 *
 * Access Patterns:
 * 1. Get all lessons for a course:
 *    Query: PK = "COURSE#<courseId>" AND SK begins_with "LESSON#"
 *
 * 2. Get specific lesson (direct lookup):
 *    Query: GSI1PK = "LESSON#<lessonId>"
 */
export interface LessonEntity {
  // DynamoDB Keys
  PK: string;              // "COURSE#<courseId>"
  SK: string;              // "LESSON#<lessonId>"
  GSI1PK?: string;         // "LESSON#<lessonId>" (for direct lesson lookup)
  GSI1SK?: string;         // "COURSE#<courseId>" (for reverse index)

  // Lesson Data
  lessonId: string;        // "lesson-1"
  courseId: string;        // "spec-driven-dev-mini"
  title: string;           // "Introduction to Spec-Driven Development"
  description?: string;    // Optional detailed description
  videoKey: string;        // S3 key: "courses/spec-driven-dev-mini/lesson-1.mp4"
  lengthInMins?: number;   // Optional: 15 (can be derived from video metadata)
  thumbnailKey?: string;   // Optional: S3 key for thumbnail image "courses/spec-driven-dev-mini/thumbnails/lesson-1.jpg"
  order: number;           // Display order: 1, 2, 3, 4, 5

  // Timestamps
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}

/**
 * Lesson API Response Type
 * Frontend-facing type that extends the base Lesson type
 * and includes additional fields populated by the API
 */
export interface LessonResponse extends Lesson {
  courseId: string;
  description?: string;
  thumbnailUrl?: string;   // Signed CloudFront URL (not S3 key) - generated in Slice 1.2
  order: number;
  isCompleted?: boolean;   // Populated when fetching with student context
}
