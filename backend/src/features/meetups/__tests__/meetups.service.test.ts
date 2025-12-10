import { jest, describe, it, beforeEach, beforeAll, afterAll, expect } from '@jest/globals';
import { DateTime } from 'luxon';
import type { MeetupSignupCompletedEvent } from '../meetups.types.js';

// Mock dependencies
const mockGetSignup = jest.fn();
const mockCreateSignup = jest.fn();
const mockGetStudentSignups = jest.fn();

jest.unstable_mockModule('../meetups.repository', () => ({
  meetupsRepository: {
    getSignup: mockGetSignup,
    createSignup: mockCreateSignup,
    getStudentSignups: mockGetStudentSignups,
  },
}));

jest.unstable_mockModule('../../../lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock SNS client
const mockSend = jest.fn();
jest.unstable_mockModule('../../../lib/sns', () => ({
  getSnsClient: () => ({
    send: mockSend,
  }),
  PublishCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

// Mock metrics
const mockAddMetric = jest.fn();
jest.unstable_mockModule('../../../lib/metrics', () => ({
  createMetrics: () => ({
    addMetric: mockAddMetric,
    publishStoredMetrics: jest.fn(),
  }),
  MetricUnit: {
    Count: 'Count',
  },
}));

// Import after mocking
const { MeetupsService } = await import('../meetups.service.js');

describe('MeetupsService', () => {
  let service: InstanceType<typeof MeetupsService>;
  const originalEnv = process.env.TRANSACTIONAL_EMAIL_TOPIC_ARN;

  beforeAll(() => {
    process.env.TRANSACTIONAL_EMAIL_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789:test-topic';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({ MessageId: 'test-message-id' });
    service = new MeetupsService();
  });

  afterAll(() => {
    process.env.TRANSACTIONAL_EMAIL_TOPIC_ARN = originalEnv;
  });

  describe('getMeetups', () => {
    it('should return all meetups when user has no signups', async () => {
      mockGetStudentSignups.mockResolvedValue([]);

      const result = await service.getMeetups('user-123');

      expect(result).toHaveLength(1); // Single combined meetup
      expect(result[0].meetupId).toBe('spec-driven-dev-weekly');
      expect(result[0].isSignedUp).toBe(false);
      expect(result[0].nextOccurrence).toBeTruthy();
      expect(result[0].hostName).toBe('Rico Romero');
    });

    it('should return meetups with isSignedUp true when user has signups', async () => {
      mockGetStudentSignups.mockResolvedValue([
        {
          PK: 'STUDENT#user-123',
          SK: 'MEETUP_SIGNUP#spec-driven-dev-weekly',
          meetupId: 'spec-driven-dev-weekly',
          signedUpAt: '2025-01-15T10:00:00Z',
          entityType: 'MEETUP_SIGNUP',
        },
      ]);

      const result = await service.getMeetups('user-123');

      expect(result[0].isSignedUp).toBe(true);
    });

    it('should include zoomLink when meeting is running', async () => {
      mockGetStudentSignups.mockResolvedValue([]);

      // Mock isCurrentlyRunning to return true
      const originalIsCurrentlyRunning = service['isCurrentlyRunning'];
      service['isCurrentlyRunning'] = jest.fn().mockReturnValue(true);

      const result = await service.getMeetups('user-123');

      expect(result[0].isRunning).toBe(true);
      expect(result[0].zoomLink).toBe('https://zoom.us/j/XXXXXXXXXX');

      // Restore
      service['isCurrentlyRunning'] = originalIsCurrentlyRunning;
    });

    it('should exclude zoomLink when meeting is not running', async () => {
      mockGetStudentSignups.mockResolvedValue([]);

      // Mock isCurrentlyRunning to return false
      const originalIsCurrentlyRunning = service['isCurrentlyRunning'];
      service['isCurrentlyRunning'] = jest.fn().mockReturnValue(false);

      const result = await service.getMeetups('user-123');

      expect(result[0].isRunning).toBe(false);
      expect(result[0].zoomLink).toBeUndefined();

      // Restore
      service['isCurrentlyRunning'] = originalIsCurrentlyRunning;
    });
  });

  describe('signupForMeetup', () => {
    it('should create signup for valid meetup', async () => {
      mockCreateSignup.mockResolvedValue({
        PK: 'STUDENT#user-123',
        SK: 'MEETUP_SIGNUP#spec-driven-dev-weekly',
        meetupId: 'spec-driven-dev-weekly',
        signedUpAt: '2025-01-15T10:00:00Z',
        entityType: 'MEETUP_SIGNUP',
      });

      await service.signupForMeetup(
        'user-123',
        'spec-driven-dev-weekly',
        'test@example.com',
        'Test User'
      );

      expect(mockCreateSignup).toHaveBeenCalledWith('user-123', 'spec-driven-dev-weekly');
    });

    it('should throw error for invalid meetup', async () => {
      await expect(
        service.signupForMeetup('user-123', 'invalid-meetup', 'test@example.com', 'Test User')
      ).rejects.toThrow('Meetup not found');

      expect(mockCreateSignup).not.toHaveBeenCalled();
    });

    it('should handle duplicate signup gracefully (idempotent)', async () => {
      const error = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';
      mockCreateSignup.mockRejectedValue(error);

      // Should not throw - idempotent
      await service.signupForMeetup(
        'user-123',
        'spec-driven-dev-weekly',
        'test@example.com',
        'Test User'
      );

      expect(mockCreateSignup).toHaveBeenCalled();
    });
  });

  describe('getNextOccurrence', () => {
    it('should return next Saturday at 10 AM CST', () => {
      const schedule = {
        dayOfWeek: 6, // Saturday
        hour: 10,
        minute: 0,
        timezone: 'America/Chicago',
      };

      const next = service['getNextOccurrence'](schedule);

      expect(next.weekday).toBe(6); // Saturday
      expect(next.hour).toBe(10);
      expect(next.minute).toBe(0);
      expect(next.zoneName).toBe('America/Chicago');
    });

    it('should skip to next week if already passed this week', () => {
      const schedule = {
        dayOfWeek: 6, // Saturday
        hour: 10,
        minute: 0,
        timezone: 'America/Chicago',
      };

      const next = service['getNextOccurrence'](schedule);
      const now = DateTime.now().setZone('America/Chicago');

      // Next occurrence should be in the future
      expect(next > now).toBe(true);
    });
  });

  describe('isCurrentlyRunning', () => {
    it('should return true when within meeting window on correct day', () => {
      const schedule = {
        dayOfWeek: 6, // Saturday
        hour: 10,
        minute: 0,
        timezone: 'America/Chicago',
      };
      const duration = 60;

      // Mock DateTime.now to return Saturday 10:30 AM CST
      const now = DateTime.fromObject(
        { weekday: 6, hour: 10, minute: 30 },
        { zone: 'America/Chicago' }
      );

      // Temporarily override DateTime.now
      const originalNow = DateTime.now;
      DateTime.now = () => now;

      const result = service['isCurrentlyRunning'](schedule, duration);

      // Restore
      DateTime.now = originalNow;

      expect(result).toBe(true);
    });

    it('should return false when outside meeting window', () => {
      const schedule = {
        dayOfWeek: 6, // Saturday
        hour: 10,
        minute: 0,
        timezone: 'America/Chicago',
      };
      const duration = 60;

      // Mock DateTime.now to return Saturday 11:30 AM CST (after meeting)
      const now = DateTime.fromObject(
        { weekday: 6, hour: 11, minute: 30 },
        { zone: 'America/Chicago' }
      );

      const originalNow = DateTime.now;
      DateTime.now = () => now;

      const result = service['isCurrentlyRunning'](schedule, duration);

      DateTime.now = originalNow;

      expect(result).toBe(false);
    });

    it('should return false when not meeting day', () => {
      const schedule = {
        dayOfWeek: 6, // Saturday
        hour: 10,
        minute: 0,
        timezone: 'America/Chicago',
      };
      const duration = 60;

      // Mock DateTime.now to return Monday 10:30 AM CST
      const now = DateTime.fromObject(
        { weekday: 1, hour: 10, minute: 30 },
        { zone: 'America/Chicago' }
      );

      const originalNow = DateTime.now;
      DateTime.now = () => now;

      const result = service['isCurrentlyRunning'](schedule, duration);

      DateTime.now = originalNow;

      expect(result).toBe(false);
    });
  });

  describe('SNS event publishing', () => {
    it('should publish MeetupSignupCompleted event to SNS after successful signup', async () => {
      mockCreateSignup.mockResolvedValue(undefined);

      await service.signupForMeetup(
        'student-123',
        'spec-driven-dev-weekly',
        'student@example.com',
        'Test Student'
      );

      expect(mockSend).toHaveBeenCalledTimes(1);

      const publishCommand = mockSend.mock.calls[0][0];
      expect(publishCommand.input.TopicArn).toBe('arn:aws:sns:us-east-1:123456789:test-topic');
      expect(publishCommand.input.Subject).toBe('Meetup Signup Completed');

      const message = JSON.parse(publishCommand.input.Message) as MeetupSignupCompletedEvent;
      expect(message.eventType).toBe('MeetupSignupCompleted');
      expect(message.studentId).toBe('student-123');
      expect(message.studentEmail).toBe('student@example.com');
      expect(message.studentName).toBe('Test Student');
      expect(message.meetupId).toBe('spec-driven-dev-weekly');
      expect(message.signedUpAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should still complete signup when SNS publish fails', async () => {
      mockCreateSignup.mockResolvedValue(undefined);
      mockSend.mockRejectedValue(new Error('SNS service unavailable'));

      // Should not throw - signup should succeed even if SNS fails
      await service.signupForMeetup(
        'student-456',
        'spec-driven-dev-weekly',
        'student@example.com',
        'Test Student'
      );

      expect(mockCreateSignup).toHaveBeenCalledWith('student-456', 'spec-driven-dev-weekly');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should record MeetupSignupEventPublished metric on SNS success', async () => {
      mockCreateSignup.mockResolvedValue(undefined);

      await service.signupForMeetup(
        'student-789',
        'spec-driven-dev-weekly',
        'student@example.com',
        'Test Student'
      );

      expect(mockAddMetric).toHaveBeenCalledWith(
        'MeetupSignupEventPublished',
        expect.anything(),
        1
      );
    });

    it('should record MeetupSignupEventPublishFailed metric on SNS failure', async () => {
      mockCreateSignup.mockResolvedValue(undefined);
      mockSend.mockRejectedValue(new Error('SNS error'));

      await service.signupForMeetup(
        'student-fail',
        'spec-driven-dev-weekly',
        'student@example.com',
        'Test Student'
      );

      expect(mockAddMetric).toHaveBeenCalledWith(
        'MeetupSignupEventPublishFailed',
        expect.anything(),
        1
      );
    });

    it('should include correct event payload in SNS message', async () => {
      mockCreateSignup.mockResolvedValue(undefined);

      const beforeSignup = new Date().toISOString();

      await service.signupForMeetup(
        'student-payload',
        'spec-driven-dev-weekly',
        'payload@example.com',
        'Payload Student'
      );

      const afterSignup = new Date().toISOString();

      const publishCommand = mockSend.mock.calls[0][0];
      const message = JSON.parse(publishCommand.input.Message) as MeetupSignupCompletedEvent;

      // Verify all required fields
      expect(message).toEqual({
        eventType: 'MeetupSignupCompleted',
        studentId: 'student-payload',
        studentEmail: 'payload@example.com',
        studentName: 'Payload Student',
        meetupId: 'spec-driven-dev-weekly',
        signedUpAt: expect.any(String),
      });

      // Verify timestamp is within reasonable range
      expect(message.signedUpAt >= beforeSignup).toBe(true);
      expect(message.signedUpAt <= afterSignup).toBe(true);
    });

    it('should publish SNS event even for idempotent duplicate signup', async () => {
      const error = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';
      mockCreateSignup.mockRejectedValue(error);

      await service.signupForMeetup(
        'student-duplicate',
        'spec-driven-dev-weekly',
        'duplicate@example.com',
        'Duplicate Student'
      );

      // SNS should still be called even for duplicate signup
      expect(mockSend).toHaveBeenCalledTimes(1);

      const publishCommand = mockSend.mock.calls[0][0];
      const message = JSON.parse(publishCommand.input.Message) as MeetupSignupCompletedEvent;
      expect(message.studentId).toBe('student-duplicate');
      expect(message.studentEmail).toBe('duplicate@example.com');
    });
  });
});
