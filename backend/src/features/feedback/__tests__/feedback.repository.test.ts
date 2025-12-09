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
const { feedbackRepository } = await import('../feedback.repository.js');

describe('FeedbackRepository', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  describe('create', () => {
    it('should create feedback with correct DynamoDB keys', async () => {
      const feedback = {
        feedbackId: 'feedback-123',
        userId: 'user-456',
        feedback: 'Great app!',
        category: 'general' as const,
        rating: 5,
        createdAt: '2025-01-15T10:30:00Z',
      };

      sendMock.mockResolvedValue({});

      await feedbackRepository.create(feedback);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const putCommandArg = sendMock.mock.calls[0][0];

      expect(putCommandArg.input.TableName).toBe('EducationTableTest');
      expect(putCommandArg.input.Item).toEqual({
        PK: 'FEEDBACK#feedback-123',
        SK: 'METADATA',
        GSI1PK: 'FEEDBACK',
        GSI1SK: '2025-01-15T10:30:00Z',
        entityType: 'FEEDBACK',
        feedbackId: 'feedback-123',
        userId: 'user-456',
        feedback: 'Great app!',
        category: 'general',
        rating: 5,
        createdAt: '2025-01-15T10:30:00Z',
      });
    });

    it('should create bug report without rating', async () => {
      const feedback = {
        feedbackId: 'feedback-789',
        userId: 'user-123',
        feedback: 'Button is broken',
        category: 'bug' as const,
        rating: undefined,
        createdAt: '2025-01-15T11:00:00Z',
      };

      sendMock.mockResolvedValue({});

      await feedbackRepository.create(feedback);

      const putCommandArg = sendMock.mock.calls[0][0];
      expect(putCommandArg.input.Item.category).toBe('bug');
      expect(putCommandArg.input.Item.rating).toBeUndefined();
    });

    it('should create feature request without rating', async () => {
      const feedback = {
        feedbackId: 'feedback-abc',
        userId: 'user-xyz',
        feedback: 'Please add dark mode',
        category: 'feature' as const,
        rating: undefined,
        createdAt: '2025-01-15T12:00:00Z',
      };

      sendMock.mockResolvedValue({});

      await feedbackRepository.create(feedback);

      const putCommandArg = sendMock.mock.calls[0][0];
      expect(putCommandArg.input.Item.category).toBe('feature');
      expect(putCommandArg.input.Item.rating).toBeUndefined();
    });

    it('should set GSI1SK to createdAt for date-sorted queries', async () => {
      const feedback = {
        feedbackId: 'feedback-date',
        userId: 'user-date',
        feedback: 'Testing date sorting',
        category: 'general' as const,
        rating: 4,
        createdAt: '2025-06-01T09:00:00Z',
      };

      sendMock.mockResolvedValue({});

      await feedbackRepository.create(feedback);

      const putCommandArg = sendMock.mock.calls[0][0];
      expect(putCommandArg.input.Item.GSI1PK).toBe('FEEDBACK');
      expect(putCommandArg.input.Item.GSI1SK).toBe('2025-06-01T09:00:00Z');
    });

    it('should throw error when DynamoDB fails', async () => {
      const feedback = {
        feedbackId: 'feedback-fail',
        userId: 'user-fail',
        feedback: 'This will fail',
        category: 'general' as const,
        rating: 3,
        createdAt: '2025-01-15T13:00:00Z',
      };

      sendMock.mockRejectedValue(new Error('DynamoDB error'));

      await expect(feedbackRepository.create(feedback)).rejects.toThrow('DynamoDB error');
    });
  });
});
