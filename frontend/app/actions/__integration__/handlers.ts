/**
 * MSW handlers for integration tests
 * These handlers mock the backend API at the network level
 */
import { http, HttpResponse } from 'msw';
import type { LessonResponse, VideoUrlResponse } from '@/types/lessons';
import type { ProgressResponse } from '../progress';
import type { Course } from '@/types/courses';
import type { Enrollment } from '../enrollments';
import type { MeetupResponse } from '../meetups';
import type { Student } from '../students';

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
  {
    courseId: 'premium-spec-course',
    name: 'Advanced Spec-Driven Development Mastery',
    description: 'Master advanced spec-driven development techniques with real-world case studies',
    instructor: 'Rico Romero',
    pricingModel: 'paid',
    price: 19900,
    imageUrl: '/courses/premium-spec.jpg',
    learningObjectives: [
      'Design complex multi-feature specifications',
      'Implement advanced context engineering patterns',
    ],
    curriculum: [],
    comingSoon: true,
    estimatedDuration: '6-8 hours',
    totalLessons: null,
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

// Mock meetup data
export const mockMeetups: MeetupResponse[] = [
  {
    meetupId: 'spec-driven-dev-weekly',
    title: 'Spec Driven Development',
    description: 'Weekly discussion on spec-driven workflows, best practices, and Q&A',
    nextOccurrence: '2025-01-25T16:00:00.000Z', // Saturday 10 AM CST
    isRunning: false,
    isSignedUp: false,
    duration: 60,
    hostName: 'Rico Martinez',
  },
];

// Track meetup signups in memory (for integration tests)
export const meetupSignups = new Set<string>();

// Mock student data
export let mockStudent: Student = {
  studentId: 'student-test-123',
  userId: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  interestedInPremium: false,
};

// Helper to reset student state (for tests)
export function resetStudentState() {
  mockStudent = {
    studentId: 'student-test-123',
    userId: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    interestedInPremium: false,
  };
}

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

  // POST /api/progress/access - Track lesson access (lightweight update)
  http.post(`${API_URL}/api/progress/access`, async () => {
    // Fire-and-forget endpoint - returns 204 No Content
    return new HttpResponse(null, { status: 204 });
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

  // GET /api/meetups - Get all meetups with signup status
  http.get(`${API_URL}/api/meetups`, () => {
    // Return meetups with signup status based on meetupSignups set
    const meetupsWithStatus = mockMeetups.map((meetup) => ({
      ...meetup,
      isSignedUp: meetupSignups.has(meetup.meetupId),
    }));

    return HttpResponse.json(meetupsWithStatus);
  }),

  // POST /api/meetups/:meetupId/signup - Sign up for a meetup
  http.post(`${API_URL}/api/meetups/:meetupId/signup`, ({ params }) => {
    const { meetupId } = params as { meetupId: string };

    // Check if meetup exists
    const meetupExists = mockMeetups.some((m) => m.meetupId === meetupId);
    if (!meetupExists) {
      return HttpResponse.json(
        { error: 'Meetup not found' },
        { status: 404 }
      );
    }

    // Add to signups set
    meetupSignups.add(meetupId);

    return HttpResponse.json({ success: true });
  }),

  // GET /api/students/me - Get current student profile
  http.get(`${API_URL}/api/students/me`, () => {
    return HttpResponse.json(mockStudent);
  }),

  // POST /api/students/early-access - Sign up for early access
  http.post(`${API_URL}/api/students/early-access`, async ({ request }) => {
    const body = (await request.json()) as { courseId: string };

    // Update mock student
    mockStudent = {
      ...mockStudent,
      interestedInPremium: true,
      premiumInterestDate: new Date().toISOString(),
    };

    return HttpResponse.json({
      success: true,
      message: "You're on the early access list!",
      student: {
        studentId: mockStudent.studentId,
        interestedInPremium: true,
        premiumInterestDate: mockStudent.premiumInterestDate,
      },
    });
  }),
];
