import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import courseRoutes from '../course.routes.js';
import { courseService } from '../course.service.js';
import { lessonService } from '../../lessons/lesson.service.js';
import type { Course } from '../course.types.js';
import type { LessonResponse } from '../../lessons/lesson.types.js';

// Helper to create auth header
function createAuthHeader(userId: string): Record<string, string> {
  return {
    'x-amzn-request-context': JSON.stringify({
      authorizer: {
        claims: {
          sub: userId,
          email: 'test@example.com',
        },
      },
    }),
  };
}

describe('Course Routes', () => {
  let app: express.Application;
  let mockGetAllCourses: jest.SpyInstance;
  let mockGetCourse: jest.SpyInstance;
  let mockGetLessonsByCourse: jest.SpyInstance;

  beforeAll(() => {
    // Mock dependencies
    mockGetAllCourses = jest.spyOn(courseService, 'getAllCourses');
    mockGetCourse = jest.spyOn(courseService, 'getCourse');
    mockGetLessonsByCourse = jest.spyOn(lessonService, 'getLessonsByCourse');
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/courses', courseRoutes);
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGetAllCourses.mockRestore();
    mockGetCourse.mockRestore();
    mockGetLessonsByCourse.mockRestore();
  });

  describe('GET /api/courses', () => {
    it('should return all courses', async () => {
      const courses: Course[] = [
        {
          courseId: 'course-1',
          name: 'Course 1',
          description: 'First course',
          instructor: 'Instructor 1',
          pricingModel: 'free',
          imageUrl: 'https://example.com/image1.jpg',
          learningObjectives: ['Learn basics'],
          curriculum: [],
        },
        {
          courseId: 'course-2',
          name: 'Course 2',
          description: 'Second course',
          instructor: 'Instructor 2',
          pricingModel: 'paid',
          price: 99.99,
          imageUrl: 'https://example.com/image2.jpg',
          learningObjectives: ['Learn advanced'],
          curriculum: [],
        },
      ];

      mockGetAllCourses.mockResolvedValue(courses);

      const response = await request(app).get('/api/courses');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(courses);
      expect(mockGetAllCourses).toHaveBeenCalled();
    });

    it('should return empty array if no courses', async () => {
      mockGetAllCourses.mockResolvedValue([]);

      const response = await request(app).get('/api/courses');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
      expect(mockGetAllCourses).toHaveBeenCalled();
    });

    it('should return 500 if service fails', async () => {
      mockGetAllCourses.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/courses');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get courses' });
      expect(mockGetAllCourses).toHaveBeenCalled();
    });
  });

  describe('GET /api/courses/:courseId', () => {
    it('should return single course by ID', async () => {
      const courseId = 'course-123';
      const course: Course = {
        courseId,
        name: 'Test Course',
        description: 'A test course',
        instructor: 'Test Instructor',
        pricingModel: 'free',
        imageUrl: 'https://example.com/image.jpg',
        learningObjectives: ['Learn something'],
        curriculum: [
          {
            moduleId: 'module-1',
            moduleName: 'Introduction',
            videos: [
              {
                videoId: 'video-1',
                title: 'Welcome',
                lengthInMins: 5,
                videoPath: '/videos/welcome.mp4',
              },
            ],
          },
        ],
      };

      mockGetCourse.mockResolvedValue(course);

      const response = await request(app).get(`/api/courses/${courseId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(course);
      expect(mockGetCourse).toHaveBeenCalledWith(courseId);
    });

    it('should return 404 if course not found', async () => {
      const courseId = 'nonexistent-course';

      mockGetCourse.mockResolvedValue(undefined);

      const response = await request(app).get(`/api/courses/${courseId}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Course not found' });
      expect(mockGetCourse).toHaveBeenCalledWith(courseId);
    });

    it('should return 500 if service fails', async () => {
      const courseId = 'course-123';

      mockGetCourse.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get(`/api/courses/${courseId}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to get course' });
      expect(mockGetCourse).toHaveBeenCalledWith(courseId);
    });

    it('should handle courses with paid pricing model', async () => {
      const courseId = 'course-456';
      const paidCourse: Course = {
        courseId,
        name: 'Premium Course',
        description: 'A paid course',
        instructor: 'Premium Instructor',
        pricingModel: 'paid',
        price: 199.99,
        imageUrl: 'https://example.com/premium.jpg',
        learningObjectives: ['Advanced topics'],
        curriculum: [],
      };

      mockGetCourse.mockResolvedValue(paidCourse);

      const response = await request(app).get(`/api/courses/${courseId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(paidCourse);
      expect(response.body.price).toBe(199.99);
    });
  });

  describe('GET /api/courses/:courseId/lessons', () => {
    it('should return 401 if user not authenticated', async () => {
      const response = await request(app).get('/api/courses/course-123/lessons');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      expect(mockGetLessonsByCourse).not.toHaveBeenCalled();
    });

    it('should successfully fetch lessons', async () => {
      const userId = 'user-123';
      const courseId = 'spec-driven-dev-mini';

      const lessons: LessonResponse[] = [
        {
          lessonId: 'lesson-1',
          courseId: 'spec-driven-dev-mini',
          title: 'Introduction to Spec-Driven Development',
          description: 'Learn the fundamentals',
          lengthInMins: 15,
          order: 1,
        },
        {
          lessonId: 'lesson-2',
          courseId: 'spec-driven-dev-mini',
          title: 'Writing Your First Spec',
          lengthInMins: 20,
          order: 2,
        },
      ];

      mockGetLessonsByCourse.mockResolvedValue(lessons);

      const response = await request(app)
        .get(`/api/courses/${courseId}/lessons`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        lessons,
        totalLessons: 2,
      });
      expect(mockGetLessonsByCourse).toHaveBeenCalledWith(courseId);
    });

    it('should return empty lessons array for course with no lessons', async () => {
      const userId = 'user-123';
      const courseId = 'empty-course';

      mockGetLessonsByCourse.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/courses/${courseId}/lessons`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        lessons: [],
        totalLessons: 0,
      });
      expect(mockGetLessonsByCourse).toHaveBeenCalledWith(courseId);
    });

    it('should return 500 if service throws error', async () => {
      const userId = 'user-123';
      const courseId = 'course-123';

      mockGetLessonsByCourse.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/courses/${courseId}/lessons`)
        .set(createAuthHeader(userId));

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch lessons' });
      expect(mockGetLessonsByCourse).toHaveBeenCalledWith(courseId);
    });
  });
});
