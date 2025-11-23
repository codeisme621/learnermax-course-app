import { jest, describe, it, beforeEach, expect } from '@jest/globals';

// Mock DynamoDB client BEFORE importing repository
const sendMock = jest.fn();

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

// Set env vars BEFORE importing
process.env.EDUCATION_TABLE_NAME = 'EducationTableTest';

// Import AFTER mocking
const { meetupsRepository } = await import('../meetups.repository.js');

describe('MeetupsRepository', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  describe('getSignup', () => {
    it('should return signup if exists', async () => {
      const mockSignup = {
        PK: 'STUDENT#user-123',
        SK: 'MEETUP_SIGNUP#meetup-abc',
        meetupId: 'meetup-abc',
        signedUpAt: '2025-01-15T10:00:00Z',
        entityType: 'MEETUP_SIGNUP',
      };

      sendMock.mockResolvedValue({ Item: mockSignup });

      const result = await meetupsRepository.getSignup('user-123', 'meetup-abc');

      expect(result).toEqual(mockSignup);
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'EducationTableTest',
            Key: {
              PK: 'STUDENT#user-123',
              SK: 'MEETUP_SIGNUP#meetup-abc',
            },
          }),
        })
      );
    });

    it('should return null if signup not found', async () => {
      sendMock.mockResolvedValue({ Item: undefined });

      const result = await meetupsRepository.getSignup('user-123', 'meetup-abc');

      expect(result).toBeNull();
    });
  });

  describe('createSignup', () => {
    it('should create signup successfully', async () => {
      sendMock.mockResolvedValue({});

      const result = await meetupsRepository.createSignup('user-123', 'meetup-abc');

      expect(result.PK).toBe('STUDENT#user-123');
      expect(result.SK).toBe('MEETUP_SIGNUP#meetup-abc');
      expect(result.meetupId).toBe('meetup-abc');
      expect(result.entityType).toBe('MEETUP_SIGNUP');
      expect(result.signedUpAt).toBeTruthy();

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'EducationTableTest',
            ConditionExpression: 'attribute_not_exists(PK)',
          }),
        })
      );
    });

    it('should throw ConditionalCheckFailedException if already exists', async () => {
      const error = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';
      sendMock.mockRejectedValue(error);

      await expect(
        meetupsRepository.createSignup('user-123', 'meetup-abc')
      ).rejects.toThrow('ConditionalCheckFailedException');
    });
  });

  describe('getStudentSignups', () => {
    it('should return array of signups', async () => {
      const mockSignups = [
        {
          PK: 'STUDENT#user-123',
          SK: 'MEETUP_SIGNUP#meetup-1',
          meetupId: 'meetup-1',
          signedUpAt: '2025-01-15T10:00:00Z',
          entityType: 'MEETUP_SIGNUP',
        },
        {
          PK: 'STUDENT#user-123',
          SK: 'MEETUP_SIGNUP#meetup-2',
          meetupId: 'meetup-2',
          signedUpAt: '2025-01-16T10:00:00Z',
          entityType: 'MEETUP_SIGNUP',
        },
      ];

      sendMock.mockResolvedValue({ Items: mockSignups });

      const result = await meetupsRepository.getStudentSignups('user-123');

      expect(result).toEqual(mockSignups);
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'EducationTableTest',
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
            ExpressionAttributeValues: {
              ':pk': 'STUDENT#user-123',
              ':sk': 'MEETUP_SIGNUP#',
            },
          }),
        })
      );
    });

    it('should return empty array if no signups', async () => {
      sendMock.mockResolvedValue({ Items: undefined });

      const result = await meetupsRepository.getStudentSignups('user-123');

      expect(result).toEqual([]);
    });
  });
});
