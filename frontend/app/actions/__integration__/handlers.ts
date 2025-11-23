/**
 * MSW handlers for integration tests
 * These handlers mock the backend API at the network level
 */
import { http, HttpResponse } from 'msw';
import type { LessonResponse, VideoUrlResponse } from '../lessons';
import type { ProgressResponse } from '../progress';
import type { Course } from '../courses';
import type { Enrollment } from '../enrollments';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Mock course data
export const mockCourses: Course[] = [
  {
    courseId: 'spec-driven-dev-mini',
    name: 'Spec Driven Development Course',
    description: 'Learn to write specs that guide implementation',
    instructor: 'Rico Martinez',
    pricingModel: 'free',
    imageUrl: '/courses/spec-driven-dev.jpg',
    learningObjectives: ['Write clear specs', 'Guide AI implementation'],
    curriculum: [],
  },
  {
    courseId: 'context-engineering',
    name: 'Context Engineering Fundamentals',
    description: 'Master the art of context engineering for AI',
    instructor: 'Rico Martinez',
    pricingModel: 'paid',
    price: 49.99,
    imageUrl: '/courses/context-eng.jpg',
    learningObjectives: ['Understand context windows', 'Optimize AI interactions'],
    curriculum: [],
  },
];

// Mock enrollment data
export const mockEnrollments: Enrollment[] = [
  {
    userId: 'test-user-123',
    courseId: 'spec-driven-dev-mini',
    enrollmentType: 'free',
    enrolledAt: '2025-01-13T12:00:00.000Z',
    paymentStatus: 'free',
    progress: 33, // Static value (not used anymore)
    completed: false,
  },
];

// Mock lesson data (with completion status for integration tests)
export const mockLessons: LessonResponse[] = [
  {
    lessonId: 'lesson-1',
    courseId: 'spec-driven-dev-mini',
    title: 'Introduction to Spec-Driven Development',
    description: 'Learn the fundamentals of spec-driven development',
    lengthInMins: 15,
    order: 1,
    isCompleted: true, // Marked as completed in default mock progress
  },
  {
    lessonId: 'lesson-2',
    courseId: 'spec-driven-dev-mini',
    title: 'Writing Your First Spec',
    description: 'Hands-on practice writing specifications',
    lengthInMins: 20,
    order: 2,
    isCompleted: false,
  },
  {
    lessonId: 'lesson-3',
    courseId: 'spec-driven-dev-mini',
    title: 'Context Engineering Best Practices',
    lengthInMins: 25,
    order: 3,
    isCompleted: false,
  },
];

// Default handlers for successful responses
export const handlers = [
  // GET /api/courses - Get all courses
  http.get(`${API_URL}/api/courses`, () => {
    return HttpResponse.json(mockCourses); // Return array directly
  }),

  // GET /api/enrollments - Get user enrollments
  http.get(`${API_URL}/api/enrollments`, () => {
    return HttpResponse.json(mockEnrollments); // Return array directly
  }),

  // GET /api/courses/:courseId/lessons
  http.get(`${API_URL}/api/courses/:courseId/lessons`, ({ params }) => {
    const { courseId } = params;

    if (courseId === 'not-found') {
      return HttpResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    if (courseId === 'not-enrolled') {
      return HttpResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    return HttpResponse.json({
      lessons: mockLessons,
      totalLessons: mockLessons.length,
    });
  }),

  // GET /api/lessons/:lessonId/video-url
  http.get(`${API_URL}/api/lessons/:lessonId/video-url`, ({ params }) => {
    const { lessonId } = params;

    if (lessonId === 'not-found') {
      return HttpResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    if (lessonId === 'not-enrolled') {
      return HttpResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    const videoUrl: VideoUrlResponse = {
      videoUrl: `https://d123abc.cloudfront.net/courses/spec-driven-dev-mini/${lessonId}.mp4?Signature=mock&Expires=${Math.floor(Date.now() / 1000) + 1800}`,
      expiresAt: Math.floor(Date.now() / 1000) + 1800, // 30 minutes from now
    };

    return HttpResponse.json(videoUrl);
  }),

  // GET /api/progress/:courseId
  http.get(`${API_URL}/api/progress/:courseId`, ({ params }) => {
    const { courseId } = params;

    if (courseId === 'not-found') {
      return HttpResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    if (courseId === 'not-enrolled') {
      return HttpResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Return empty progress for new course
    if (courseId === 'new-course') {
      return HttpResponse.json({
        courseId: 'new-course',
        completedLessons: [],
        percentage: 0,
        totalLessons: 3,
        updatedAt: new Date().toISOString(),
      } as ProgressResponse);
    }

    // Return progress with one lesson complete
    return HttpResponse.json({
      courseId: 'spec-driven-dev-mini',
      completedLessons: ['lesson-1'],
      lastAccessedLesson: 'lesson-1',
      percentage: 33,
      totalLessons: 3,
      updatedAt: new Date().toISOString(),
    } as ProgressResponse);
  }),

  // POST /api/progress
  http.post(`${API_URL}/api/progress`, async ({ request }) => {
    const body = (await request.json()) as { courseId: string; lessonId: string };

    if (body.courseId === 'not-found' || body.lessonId === 'not-found') {
      return HttpResponse.json(
        { error: 'Course or lesson not found' },
        { status: 404 }
      );
    }

    if (body.courseId === 'not-enrolled') {
      return HttpResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Simulate marking lesson-2 complete (2 out of 3 = 67%)
    if (body.lessonId === 'lesson-2') {
      return HttpResponse.json({
        courseId: body.courseId,
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 67,
        totalLessons: 3,
        updatedAt: new Date().toISOString(),
      } as ProgressResponse);
    }

    // Simulate marking lesson-3 complete (100%)
    if (body.lessonId === 'lesson-3') {
      return HttpResponse.json({
        courseId: body.courseId,
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        lastAccessedLesson: 'lesson-3',
        percentage: 100,
        totalLessons: 3,
        updatedAt: new Date().toISOString(),
      } as ProgressResponse);
    }

    // Default: mark first lesson complete
    return HttpResponse.json({
      courseId: body.courseId,
      completedLessons: ['lesson-1'],
      lastAccessedLesson: body.lessonId,
      percentage: 33,
      totalLessons: 3,
      updatedAt: new Date().toISOString(),
    } as ProgressResponse);
  }),
];
