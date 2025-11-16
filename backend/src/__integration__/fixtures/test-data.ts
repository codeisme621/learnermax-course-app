import type { Course } from '../../features/courses/course.types.js';
import type { Lesson } from '../../features/lessons/lesson.types.js';
import type { Enrollment } from '../../features/enrollment/enrollment.types.js';

/**
 * Create a test course with the given ID
 */
export function createTestCourse(courseId: string): Course {
  return {
    courseId,
    name: 'Integration Test Course',
    description: 'This is a test course for integration testing',
    instructor: 'Test Instructor',
    pricingModel: 'free',
    imageUrl: 'https://example.com/test-course.jpg',
    learningObjectives: [
      'Learn integration testing basics',
      'Understand DynamoDB testing',
      'Write reliable tests',
    ],
    curriculum: [],
  };
}

/**
 * Create test lessons for a course
 * @param courseId - The course ID
 * @param count - Number of lessons to create (default: 5)
 */
export function createTestLessons(courseId: string, count: number = 5): Lesson[] {
  return Array.from({ length: count }, (_, i) => ({
    lessonId: `integration-test-lesson-${i + 1}`,
    courseId,
    title: `Test Lesson ${i + 1}`,
    description: `Description for integration test lesson ${i + 1}`,
    videoKey: `integration-tests/videos/lesson-${i + 1}.mp4`,
    lengthInMins: 10 + i * 2, // Vary lengths: 10, 12, 14, 16, 18
    order: i + 1,
  }));
}

/**
 * Create a test enrollment
 */
export function createTestEnrollment(userId: string, courseId: string): Enrollment {
  return {
    userId,
    courseId,
    enrollmentType: 'free',
    paymentStatus: 'completed',
    enrolledAt: new Date().toISOString(),
    progress: 0,
    completed: false,
  };
}

/**
 * Helper to create auth header for tests
 */
export function createAuthHeader(userId: string): Record<string, string> {
  return {
    'x-amzn-request-context': JSON.stringify({
      authorizer: {
        claims: {
          sub: userId,
          email: 'integration-test@example.com',
        },
      },
    }),
  };
}
