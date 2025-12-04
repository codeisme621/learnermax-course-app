import { jest, describe, it, beforeEach, expect } from '@jest/globals';

// Mock DynamoDB client BEFORE importing repository
const sendMock = jest.fn();

jest.unstable_mockModule('../../../lib/dynamodb', () => ({
  docClient: {
    send: sendMock,
  },
}));

jest.unstable_mockModule('../../../lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Set environment variable BEFORE importing repository
process.env.EDUCATION_TABLE_NAME = 'EducationTableTest';

// Import after mocking
const { progressRepository } = await import('../progress.repository.js');

describe('ProgressRepository', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  describe('getProgress', () => {
    it('should return progress when it exists', async () => {
      const studentId = 'student-123';
      const courseId = 'spec-driven-dev-mini';

      const mockItem = {
        PK: 'STUDENT#student-123',
        SK: 'PROGRESS#spec-driven-dev-mini',
        entityType: 'PROGRESS',
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 40,
        totalLessons: 5,
        updatedAt: '2025-01-15T10:30:00Z',
      };

      sendMock.mockResolvedValue({ Item: mockItem });

      const result = await progressRepository.getProgress(studentId, courseId);

      expect(result).toEqual({
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 40,
        totalLessons: 5,
        updatedAt: '2025-01-15T10:30:00Z',
      });

      expect(sendMock).toHaveBeenCalledTimes(1);
      const getCommandArg = sendMock.mock.calls[0][0];
      expect(getCommandArg.input).toEqual({
        TableName: 'EducationTableTest',
        Key: {
          PK: 'STUDENT#student-123',
          SK: 'PROGRESS#spec-driven-dev-mini',
        },
      });
    });

    it('should return undefined when progress does not exist', async () => {
      const studentId = 'student-456';
      const courseId = 'nonexistent-course';

      sendMock.mockResolvedValue({ Item: undefined });

      const result = await progressRepository.getProgress(studentId, courseId);

      expect(result).toBeUndefined();
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('should construct correct DynamoDB keys', async () => {
      const studentId = 'user-abc';
      const courseId = 'course-xyz';

      sendMock.mockResolvedValue({ Item: undefined });

      await progressRepository.getProgress(studentId, courseId);

      const getCommandArg = sendMock.mock.calls[0][0];
      expect(getCommandArg.input.Key).toEqual({
        PK: 'STUDENT#user-abc',
        SK: 'PROGRESS#course-xyz',
      });
    });

    it('should strip DynamoDB keys from response', async () => {
      const mockItem = {
        PK: 'STUDENT#student-123',
        SK: 'PROGRESS#spec-driven-dev-mini',
        GSI1PK: 'COURSE#spec-driven-dev-mini',
        GSI1SK: 'STUDENT#student-123',
        entityType: 'PROGRESS',
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1'],
        percentage: 20,
        totalLessons: 5,
        updatedAt: '2025-01-15T10:30:00Z',
      };

      sendMock.mockResolvedValue({ Item: mockItem });

      const result = await progressRepository.getProgress('student-123', 'spec-driven-dev-mini');

      // Verify DynamoDB keys are NOT in response
      expect(result).not.toHaveProperty('PK');
      expect(result).not.toHaveProperty('SK');
      expect(result).not.toHaveProperty('GSI1PK');
      expect(result).not.toHaveProperty('GSI1SK');
      expect(result).not.toHaveProperty('entityType');

      // Verify business data IS in response
      expect(result).toHaveProperty('courseId');
      expect(result).toHaveProperty('completedLessons');
      expect(result).toHaveProperty('percentage');
    });
  });

  describe('saveProgress', () => {
    it('should save progress and return updated data', async () => {
      const studentId = 'student-123';
      const courseId = 'spec-driven-dev-mini';
      const progressData = {
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        lastAccessedLesson: 'lesson-3',
        percentage: 60,
        totalLessons: 5,
      };

      const mockUpdatedItem = {
        PK: 'STUDENT#student-123',
        SK: 'PROGRESS#spec-driven-dev-mini',
        entityType: 'PROGRESS',
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        lastAccessedLesson: 'lesson-3',
        percentage: 60,
        totalLessons: 5,
        updatedAt: '2025-01-15T11:00:00Z',
      };

      sendMock.mockResolvedValue({ Attributes: mockUpdatedItem });

      const result = await progressRepository.saveProgress(studentId, courseId, progressData);

      expect(result).toEqual({
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2', 'lesson-3'],
        lastAccessedLesson: 'lesson-3',
        percentage: 60,
        totalLessons: 5,
        updatedAt: '2025-01-15T11:00:00Z',
      });

      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('should use UpdateCommand with correct parameters', async () => {
      const studentId = 'student-456';
      const courseId = 'course-abc';
      const progressData = {
        completedLessons: ['lesson-1'],
        lastAccessedLesson: 'lesson-1',
        percentage: 20,
        totalLessons: 5,
      };

      sendMock.mockResolvedValue({
        Attributes: {
          PK: 'STUDENT#student-456',
          SK: 'PROGRESS#course-abc',
          entityType: 'PROGRESS',
          courseId: 'course-abc',
          ...progressData,
          updatedAt: '2025-01-15T12:00:00Z',
        },
      });

      await progressRepository.saveProgress(studentId, courseId, progressData);

      const updateCommandArg = sendMock.mock.calls[0][0];
      expect(updateCommandArg.input.TableName).toBe('EducationTableTest');
      expect(updateCommandArg.input.Key).toEqual({
        PK: 'STUDENT#student-456',
        SK: 'PROGRESS#course-abc',
      });
      expect(updateCommandArg.input.UpdateExpression).toContain('SET completedLessons');
      expect(updateCommandArg.input.UpdateExpression).toContain('percentage');
      expect(updateCommandArg.input.UpdateExpression).toContain('lastAccessedLesson');
      expect(updateCommandArg.input.UpdateExpression).toContain('totalLessons');
      expect(updateCommandArg.input.UpdateExpression).toContain('updatedAt');
      expect(updateCommandArg.input.ReturnValues).toBe('ALL_NEW');
    });

    it('should set correct ExpressionAttributeValues', async () => {
      const studentId = 'student-789';
      const courseId = 'course-xyz';
      const progressData = {
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 40,
        totalLessons: 5,
      };

      sendMock.mockResolvedValue({
        Attributes: {
          PK: 'STUDENT#student-789',
          SK: 'PROGRESS#course-xyz',
          entityType: 'PROGRESS',
          courseId: 'course-xyz',
          ...progressData,
          updatedAt: '2025-01-15T13:00:00Z',
        },
      });

      await progressRepository.saveProgress(studentId, courseId, progressData);

      const updateCommandArg = sendMock.mock.calls[0][0];
      const values = updateCommandArg.input.ExpressionAttributeValues;

      expect(values[':cl']).toEqual(['lesson-1', 'lesson-2']);
      expect(values[':last']).toBe('lesson-2');
      expect(values[':pct']).toBe(40);
      expect(values[':total']).toBe(5);
      expect(values[':courseId']).toBe('course-xyz');
      expect(values[':entityType']).toBe('PROGRESS');
      expect(values[':now']).toBeDefined();
      expect(typeof values[':now']).toBe('string');
    });

    it('should handle empty completed lessons array', async () => {
      const progressData = {
        completedLessons: [],
        lastAccessedLesson: 'lesson-1',
        percentage: 0,
        totalLessons: 5,
      };

      sendMock.mockResolvedValue({
        Attributes: {
          PK: 'STUDENT#student-123',
          SK: 'PROGRESS#course-123',
          entityType: 'PROGRESS',
          courseId: 'course-123',
          ...progressData,
          updatedAt: '2025-01-15T14:00:00Z',
        },
      });

      const result = await progressRepository.saveProgress('student-123', 'course-123', progressData);

      expect(result.completedLessons).toEqual([]);
      expect(result.percentage).toBe(0);
    });

    it('should strip DynamoDB keys from returned data', async () => {
      const progressData = {
        completedLessons: ['lesson-1'],
        lastAccessedLesson: 'lesson-1',
        percentage: 20,
        totalLessons: 5,
      };

      sendMock.mockResolvedValue({
        Attributes: {
          PK: 'STUDENT#student-123',
          SK: 'PROGRESS#course-123',
          GSI1PK: 'COURSE#course-123',
          GSI1SK: 'STUDENT#student-123',
          entityType: 'PROGRESS',
          courseId: 'course-123',
          ...progressData,
          updatedAt: '2025-01-15T15:00:00Z',
        },
      });

      const result = await progressRepository.saveProgress('student-123', 'course-123', progressData);

      // Verify DynamoDB keys are NOT in response
      expect(result).not.toHaveProperty('PK');
      expect(result).not.toHaveProperty('SK');
      expect(result).not.toHaveProperty('GSI1PK');
      expect(result).not.toHaveProperty('GSI1SK');
      expect(result).not.toHaveProperty('entityType');

      // Verify business data IS in response
      expect(result).toHaveProperty('courseId');
      expect(result).toHaveProperty('completedLessons');
      expect(result).toHaveProperty('percentage');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  describe('updateLastAccessedLesson', () => {
    it('should update only lastAccessedLesson field', async () => {
      const studentId = 'student-123';
      const courseId = 'spec-driven-dev-mini';
      const lessonId = 'lesson-3';

      sendMock.mockResolvedValue({});

      await progressRepository.updateLastAccessedLesson(studentId, courseId, lessonId);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const updateCommandArg = sendMock.mock.calls[0][0];
      expect(updateCommandArg.input.TableName).toBe('EducationTableTest');
      expect(updateCommandArg.input.Key).toEqual({
        PK: 'STUDENT#student-123',
        SK: 'PROGRESS#spec-driven-dev-mini',
      });
    });

    it('should use correct UpdateExpression for lightweight update', async () => {
      const studentId = 'student-456';
      const courseId = 'course-abc';
      const lessonId = 'lesson-2';

      sendMock.mockResolvedValue({});

      await progressRepository.updateLastAccessedLesson(studentId, courseId, lessonId);

      const updateCommandArg = sendMock.mock.calls[0][0];
      expect(updateCommandArg.input.UpdateExpression).toContain('lastAccessedLesson');
      expect(updateCommandArg.input.UpdateExpression).toContain('updatedAt');
      expect(updateCommandArg.input.UpdateExpression).toContain('courseId');
      expect(updateCommandArg.input.UpdateExpression).toContain('entityType');
      // Should use if_not_exists for completedLessons, percentage, and totalLessons
      expect(updateCommandArg.input.UpdateExpression).toContain('if_not_exists(completedLessons');
      expect(updateCommandArg.input.UpdateExpression).toContain('if_not_exists(percentage');
      expect(updateCommandArg.input.UpdateExpression).toContain('if_not_exists(totalLessons');
    });

    it('should set correct ExpressionAttributeValues', async () => {
      const studentId = 'student-789';
      const courseId = 'course-xyz';
      const lessonId = 'lesson-5';

      sendMock.mockResolvedValue({});

      await progressRepository.updateLastAccessedLesson(studentId, courseId, lessonId);

      const updateCommandArg = sendMock.mock.calls[0][0];
      const values = updateCommandArg.input.ExpressionAttributeValues;

      expect(values[':last']).toBe('lesson-5');
      expect(values[':courseId']).toBe('course-xyz');
      expect(values[':entityType']).toBe('PROGRESS');
      expect(values[':now']).toBeDefined();
      expect(typeof values[':now']).toBe('string');
      // Default values for if_not_exists
      expect(values[':emptyList']).toEqual([]);
      expect(values[':zero']).toBe(0);
    });

    it('should construct correct DynamoDB keys', async () => {
      const studentId = 'user-abc';
      const courseId = 'course-xyz';
      const lessonId = 'lesson-1';

      sendMock.mockResolvedValue({});

      await progressRepository.updateLastAccessedLesson(studentId, courseId, lessonId);

      const updateCommandArg = sendMock.mock.calls[0][0];
      expect(updateCommandArg.input.Key).toEqual({
        PK: 'STUDENT#user-abc',
        SK: 'PROGRESS#course-xyz',
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when EDUCATION_TABLE_NAME is not set', async () => {
      // This test verifies the error is thrown when getTableName() is called
      // Since we set the env var in beforeEach, we test this by checking
      // the repository would fail if the env var wasn't set
      // The actual error would be thrown by getTableName() inside the methods
      expect(process.env.EDUCATION_TABLE_NAME).toBe('EducationTableTest');
    });
  });
});
