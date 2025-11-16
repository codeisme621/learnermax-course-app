import { jest, describe, it, beforeEach, afterAll, expect } from '@jest/globals';

// Create mock send function
const sendMock = jest.fn();

// Mock dependencies BEFORE importing the module under test
jest.unstable_mockModule('../../../lib/dynamodb', () => ({
  docClient: { send: sendMock },
}));

jest.unstable_mockModule('../../../lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Import after mocking
const { lessonRepository } = await import('../lesson.repository.js');

describe('LessonRepository', () => {
  beforeEach(() => {
    process.env.EDUCATION_TABLE_NAME = 'EducationTableTest';
    sendMock.mockReset();
  });

  afterAll(() => {
    delete process.env.EDUCATION_TABLE_NAME;
  });

  describe('getLessonsByCourse', () => {
    it('should query DynamoDB and return lessons sorted by order', async () => {
      const courseId = 'spec-driven-dev-mini';

      // Mock DynamoDB response with lessons in reverse order
      sendMock.mockResolvedValueOnce({
        Items: [
          {
            PK: 'COURSE#spec-driven-dev-mini',
            SK: 'LESSON#lesson-2',
            GSI1PK: 'LESSON#lesson-2',
            GSI1SK: 'COURSE#spec-driven-dev-mini',
            lessonId: 'lesson-2',
            courseId: 'spec-driven-dev-mini',
            title: 'Writing Your First Spec',
            videoKey: 'courses/spec-driven-dev-mini/lesson-2.mp4',
            lengthInMins: 20,
            order: 2,
            createdAt: '2025-01-15T10:00:00Z',
            updatedAt: '2025-01-15T10:00:00Z',
          },
          {
            PK: 'COURSE#spec-driven-dev-mini',
            SK: 'LESSON#lesson-1',
            GSI1PK: 'LESSON#lesson-1',
            GSI1SK: 'COURSE#spec-driven-dev-mini',
            lessonId: 'lesson-1',
            courseId: 'spec-driven-dev-mini',
            title: 'Introduction to Spec-Driven Development',
            description: 'Learn the fundamentals',
            videoKey: 'courses/spec-driven-dev-mini/lesson-1.mp4',
            lengthInMins: 15,
            order: 1,
            createdAt: '2025-01-15T09:00:00Z',
            updatedAt: '2025-01-15T09:00:00Z',
          },
        ],
        $metadata: {},
      });

      const result = await lessonRepository.getLessonsByCourse(courseId);

      // Verify sendMock was called
      expect(sendMock).toHaveBeenCalledTimes(1);
      const [command] = sendMock.mock.calls[0];

      // Verify query parameters
      expect(command.input.TableName).toBe('EducationTableTest');
      expect(command.input.KeyConditionExpression).toBe('PK = :pk AND begins_with(SK, :skPrefix)');
      expect(command.input.ExpressionAttributeValues).toEqual({
        ':pk': 'COURSE#spec-driven-dev-mini',
        ':skPrefix': 'LESSON#',
      });

      // Should be sorted by order (ascending)
      expect(result).toHaveLength(2);
      expect(result[0].lessonId).toBe('lesson-1'); // order: 1
      expect(result[1].lessonId).toBe('lesson-2'); // order: 2

      // Should strip DynamoDB keys
      expect(result[0]).not.toHaveProperty('PK');
      expect(result[0]).not.toHaveProperty('SK');
      expect(result[0]).not.toHaveProperty('GSI1PK');
      expect(result[0]).not.toHaveProperty('GSI1SK');

      // Should preserve lesson data
      expect(result[0]).toMatchObject({
        lessonId: 'lesson-1',
        courseId: 'spec-driven-dev-mini',
        title: 'Introduction to Spec-Driven Development',
        description: 'Learn the fundamentals',
        videoKey: 'courses/spec-driven-dev-mini/lesson-1.mp4',
        lengthInMins: 15,
        order: 1,
      });
    });

    it('should return empty array if no lessons found', async () => {
      sendMock.mockResolvedValueOnce({
        Items: [],
        $metadata: {},
      });

      const result = await lessonRepository.getLessonsByCourse('empty-course');

      expect(result).toEqual([]);
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('should return empty array if Items is undefined', async () => {
      sendMock.mockResolvedValueOnce({
        $metadata: {},
      });

      const result = await lessonRepository.getLessonsByCourse('empty-course');

      expect(result).toEqual([]);
      expect(sendMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLesson', () => {
    it('should query GSI1 and return lesson by lessonId', async () => {
      const lessonId = 'lesson-1';

      sendMock.mockResolvedValueOnce({
        Items: [
          {
            PK: 'COURSE#spec-driven-dev-mini',
            SK: 'LESSON#lesson-1',
            GSI1PK: 'LESSON#lesson-1',
            GSI1SK: 'COURSE#spec-driven-dev-mini',
            lessonId: 'lesson-1',
            courseId: 'spec-driven-dev-mini',
            title: 'Introduction to Spec-Driven Development',
            videoKey: 'courses/spec-driven-dev-mini/lesson-1.mp4',
            lengthInMins: 15,
            order: 1,
            createdAt: '2025-01-15T09:00:00Z',
            updatedAt: '2025-01-15T09:00:00Z',
          },
        ],
        $metadata: {},
      });

      const result = await lessonRepository.getLesson(lessonId);

      // Verify sendMock was called
      expect(sendMock).toHaveBeenCalledTimes(1);
      const [command] = sendMock.mock.calls[0];

      // Verify query parameters
      expect(command.input.TableName).toBe('EducationTableTest');
      expect(command.input.IndexName).toBe('GSI1');
      expect(command.input.KeyConditionExpression).toBe('GSI1PK = :pk');
      expect(command.input.ExpressionAttributeValues).toEqual({
        ':pk': 'LESSON#lesson-1',
      });
      expect(command.input.Limit).toBe(1);

      // Should strip DynamoDB keys
      expect(result).not.toHaveProperty('PK');
      expect(result).not.toHaveProperty('SK');
      expect(result).not.toHaveProperty('GSI1PK');
      expect(result).not.toHaveProperty('GSI1SK');

      // Should preserve lesson data
      expect(result).toMatchObject({
        lessonId: 'lesson-1',
        courseId: 'spec-driven-dev-mini',
        title: 'Introduction to Spec-Driven Development',
        videoKey: 'courses/spec-driven-dev-mini/lesson-1.mp4',
        lengthInMins: 15,
        order: 1,
      });
    });

    it('should return undefined if lesson not found', async () => {
      sendMock.mockResolvedValueOnce({
        Items: [],
        $metadata: {},
      });

      const result = await lessonRepository.getLesson('nonexistent-lesson');

      expect(result).toBeUndefined();
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('should return undefined if Items is undefined', async () => {
      sendMock.mockResolvedValueOnce({
        $metadata: {},
      });

      const result = await lessonRepository.getLesson('nonexistent-lesson');

      expect(result).toBeUndefined();
      expect(sendMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTotalLessons', () => {
    it('should return count of lessons for a course', async () => {
      const courseId = 'spec-driven-dev-mini';

      sendMock.mockResolvedValueOnce({
        Count: 5,
        $metadata: {},
      });

      const result = await lessonRepository.getTotalLessons(courseId);

      expect(result).toBe(5);

      // Verify sendMock was called
      expect(sendMock).toHaveBeenCalledTimes(1);
      const [command] = sendMock.mock.calls[0];

      // Verify query parameters
      expect(command.input.TableName).toBe('EducationTableTest');
      expect(command.input.KeyConditionExpression).toBe('PK = :pk AND begins_with(SK, :skPrefix)');
      expect(command.input.ExpressionAttributeValues).toEqual({
        ':pk': 'COURSE#spec-driven-dev-mini',
        ':skPrefix': 'LESSON#',
      });
      expect(command.input.Select).toBe('COUNT');
    });

    it('should return 0 if Count is undefined', async () => {
      sendMock.mockResolvedValueOnce({
        $metadata: {},
      });

      const result = await lessonRepository.getTotalLessons('empty-course');

      expect(result).toBe(0);
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('should return 0 if no lessons exist', async () => {
      sendMock.mockResolvedValueOnce({
        Count: 0,
        $metadata: {},
      });

      const result = await lessonRepository.getTotalLessons('empty-course');

      expect(result).toBe(0);
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('should throw when EDUCATION_TABLE_NAME is missing', async () => {
      delete process.env.EDUCATION_TABLE_NAME;

      await expect(
        lessonRepository.getTotalLessons('course-1')
      ).rejects.toThrow('EDUCATION_TABLE_NAME environment variable is not set');
    });
  });
});
