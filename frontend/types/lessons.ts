/**
 * Lesson-related type definitions
 * Shared across the application
 */

/**
 * Lesson - Domain model for a single video lesson within a course
 * This is the clean business domain type (no DynamoDB implementation details)
 */
export interface Lesson {
  lessonId: string;        // Unique identifier: "lesson-1", "lesson-2"
  title: string;           // Lesson title: "Introduction to Spec-Driven Development"
  lengthInMins: number;    // Duration in minutes: 15, 30, 45
  videoKey: string;        // S3 object key: "courses/spec-driven-dev-mini/lesson-1.mp4"
}

/**
 * LessonResponse - What the frontend receives from API endpoints
 * Used by GET /api/courses/:courseId/lessons
 *
 * Security: Does NOT include videoKey (internal S3 key)
 * Video URLs are generated on-demand via GET /api/lessons/:lessonId/video-url
 */
export interface LessonResponse {
  lessonId: string;        // "lesson-1"
  courseId: string;        // "spec-driven-dev-mini"
  title: string;           // "Introduction to Spec-Driven Development"
  description?: string;    // Optional detailed description for lesson page
  lengthInMins?: number;   // Optional: 15, 30, 45
  order: number;           // Display order in course: 1, 2, 3, 4, 5
  isCompleted?: boolean;   // Populated when fetching with student context (from Progress entity)
  // NOTE: videoKey intentionally excluded - internal only, never exposed to frontend
}

/**
 * VideoUrlResponse - Response from GET /api/lessons/:lessonId/video-url
 * Contains signed CloudFront URL with expiration timestamp
 */
export interface VideoUrlResponse {
  videoUrl: string;    // Signed CloudFront URL
  expiresAt: number;   // Unix timestamp (seconds) when URL expires
}
