import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import courseRoutes from '../course.routes.js';
import { courseService } from '../course.service.js';
import type { Course } from '../course.types.js';

describe('Course Routes', () => {
  let app: express.Application;
  let mockGetAllCourses: jest.SpyInstance;
  let mockGetCourse: jest.SpyInstance;

  beforeAll(() => {
    // Mock dependencies
    mockGetAllCourses = jest.spyOn(courseService, 'getAllCourses');
    mockGetCourse = jest.spyOn(courseService, 'getCourse');
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
});
