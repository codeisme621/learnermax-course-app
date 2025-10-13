import { jest, describe, it, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import { CourseService } from '../course.service.js';
import type { Course } from '../course.types.js';
import { courseRepository } from '../course.repository.js';

describe('CourseService', () => {
  let service: CourseService;
  let mockGet: jest.SpyInstance;
  let mockGetAll: jest.SpyInstance;
  let mockCreate: jest.SpyInstance;

  beforeAll(() => {
    // Mock the repository
    mockGet = jest.spyOn(courseRepository, 'get');
    mockGetAll = jest.spyOn(courseRepository, 'getAll');
    mockCreate = jest.spyOn(courseRepository, 'create');
  });

  beforeEach(() => {
    service = new CourseService();
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockGet.mockRestore();
    mockGetAll.mockRestore();
    mockCreate.mockRestore();
  });

  describe('getCourse', () => {
    it('should return course by courseId', async () => {
      const courseId = 'course-123';
      const course: Course = {
        courseId,
        name: 'Test Course',
        description: 'A test course',
        instructor: 'Test Instructor',
        pricingModel: 'free',
        imageUrl: 'https://example.com/image.jpg',
        learningObjectives: ['Objective 1', 'Objective 2'],
        curriculum: [
          {
            moduleId: 'module-1',
            moduleName: 'Module 1',
            videos: [
              {
                videoId: 'video-1',
                title: 'Video 1',
                lengthInMins: 10,
                videoPath: '/videos/video-1.mp4',
              },
            ],
          },
        ],
      };

      mockGet.mockResolvedValue(course);

      const result = await service.getCourse(courseId);

      expect(result).toEqual(course);
      expect(mockGet).toHaveBeenCalledWith(courseId);
    });

    it('should return undefined if course not found', async () => {
      const courseId = 'nonexistent-course';

      mockGet.mockResolvedValue(undefined);

      const result = await service.getCourse(courseId);

      expect(result).toBeUndefined();
      expect(mockGet).toHaveBeenCalledWith(courseId);
    });
  });

  describe('getAllCourses', () => {
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

      mockGetAll.mockResolvedValue(courses);

      const result = await service.getAllCourses();

      expect(result).toEqual(courses);
      expect(mockGetAll).toHaveBeenCalled();
    });

    it('should return empty array if no courses exist', async () => {
      mockGetAll.mockResolvedValue([]);

      const result = await service.getAllCourses();

      expect(result).toEqual([]);
      expect(mockGetAll).toHaveBeenCalled();
    });
  });

  describe('createCourse', () => {
    it('should create course successfully', async () => {
      const course: Course = {
        courseId: 'course-123',
        name: 'New Course',
        description: 'A new course',
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
                title: 'Welcome Video',
                lengthInMins: 5,
                videoPath: '/videos/welcome.mp4',
              },
            ],
          },
        ],
      };

      mockCreate.mockResolvedValue();

      await service.createCourse(course);

      expect(mockCreate).toHaveBeenCalledWith(course);
    });

    it('should create paid course with price', async () => {
      const course: Course = {
        courseId: 'course-456',
        name: 'Premium Course',
        description: 'A paid course',
        instructor: 'Premium Instructor',
        pricingModel: 'paid',
        price: 199.99,
        imageUrl: 'https://example.com/premium.jpg',
        learningObjectives: ['Advanced skills'],
        curriculum: [],
      };

      mockCreate.mockResolvedValue();

      await service.createCourse(course);

      expect(mockCreate).toHaveBeenCalledWith(course);
    });

    it('should handle creation errors', async () => {
      const course: Course = {
        courseId: 'course-123',
        name: 'New Course',
        description: 'A new course',
        instructor: 'Test Instructor',
        pricingModel: 'free',
        imageUrl: 'https://example.com/image.jpg',
        learningObjectives: ['Learn something'],
        curriculum: [],
      };

      mockCreate.mockRejectedValue(new Error('Database error'));

      await expect(service.createCourse(course)).rejects.toThrow('Database error');
      expect(mockCreate).toHaveBeenCalledWith(course);
    });
  });
});
