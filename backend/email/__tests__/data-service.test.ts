import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { EnrollmentCompletedEvent, MeetupSignupCompletedEvent } from '../types';

// Set environment variables before importing modules that use them
process.env.EDUCATION_TABLE_NAME = 'test-education-table';
process.env.FRONTEND_DOMAIN = 'https://www.learnwithrico.com';

// Mock DynamoDB
const ddbMock = mockClient(DynamoDBDocumentClient);

// Import after setting env vars
let prepareEnrollmentEmailData: typeof import('../data-service').prepareEnrollmentEmailData;
let prepareMeetupEmailData: typeof import('../data-service').prepareMeetupEmailData;

beforeAll(async () => {
  const module = await import('../data-service');
  prepareEnrollmentEmailData = module.prepareEnrollmentEmailData;
  prepareMeetupEmailData = module.prepareMeetupEmailData;
});

describe('data-service', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('prepareEnrollmentEmailData', () => {
    const mockEvent: EnrollmentCompletedEvent = {
      eventType: 'EnrollmentCompleted',
      studentId: 'user-123',
      courseId: 'spec-driven-dev-mini',
      enrollmentType: 'free',
      enrolledAt: '2025-01-15T10:30:00Z',
      source: 'manual',
    };

    const mockStudent = {
      PK: 'USER#user-123',
      SK: 'METADATA',
      userId: 'user-123',
      name: 'Alex Johnson',
      email: 'alex@example.com',
    };

    const mockCourse = {
      PK: 'COURSE#spec-driven-dev-mini',
      SK: 'METADATA',
      courseId: 'spec-driven-dev-mini',
      name: 'Spec-Driven Development with Context Engineering',
      description: 'Learn to build software with AI assistance',
      instructor: 'Rico Romero',
      totalLessons: 3,
      estimatedDuration: '45 minutes',
      pricingModel: 'free',
    };

    it('prepareEnrollmentEmailData_success_returnsFormattedData', async () => {
      ddbMock
        .on(GetCommand, { Key: { PK: 'USER#user-123', SK: 'METADATA' } })
        .resolves({ Item: mockStudent });
      ddbMock
        .on(GetCommand, { Key: { PK: 'COURSE#spec-driven-dev-mini', SK: 'METADATA' } })
        .resolves({ Item: mockCourse });

      const result = await prepareEnrollmentEmailData(mockEvent);

      expect(result.studentName).toBe('Alex Johnson');
      expect(result.studentEmail).toBe('alex@example.com');
      expect(result.courseName).toBe('Spec-Driven Development with Context Engineering');
      expect(result.courseUrl).toBe('https://www.learnwithrico.com/course/spec-driven-dev-mini');
      expect(result.instructor).toBe('Rico Romero');
      expect(result.totalLessons).toBe(3);
      expect(result.estimatedDuration).toBe('45 minutes');
      expect(result.enrolledAt).toBe('January 15, 2025');
      expect(result.pricingModel).toBe('free');
    });

    it('prepareEnrollmentEmailData_studentNotFound_throwsError', async () => {
      ddbMock
        .on(GetCommand, { Key: { PK: 'USER#user-123', SK: 'METADATA' } })
        .resolves({ Item: undefined });

      await expect(prepareEnrollmentEmailData(mockEvent)).rejects.toThrow(
        'Student not found: user-123'
      );
    });

    it('prepareEnrollmentEmailData_courseNotFound_throwsError', async () => {
      ddbMock
        .on(GetCommand, { Key: { PK: 'USER#user-123', SK: 'METADATA' } })
        .resolves({ Item: mockStudent });
      ddbMock
        .on(GetCommand, { Key: { PK: 'COURSE#spec-driven-dev-mini', SK: 'METADATA' } })
        .resolves({ Item: undefined });

      await expect(prepareEnrollmentEmailData(mockEvent)).rejects.toThrow(
        'Course not found: spec-driven-dev-mini'
      );
    });
  });

  describe('prepareMeetupEmailData', () => {
    const mockEvent: MeetupSignupCompletedEvent = {
      eventType: 'MeetupSignupCompleted',
      studentId: 'user-123',
      studentEmail: 'alex@example.com',
      studentName: 'Alex Johnson',
      meetupId: 'spec-driven-dev-weekly',
      signedUpAt: '2025-01-15T10:30:00Z',
      source: 'manual',
    };

    it('prepareMeetupEmailData_success_returnsFormattedData', () => {
      const { emailData, eventData } = prepareMeetupEmailData(mockEvent);

      expect(emailData.studentName).toBe('Alex Johnson');
      expect(emailData.studentEmail).toBe('alex@example.com');
      expect(emailData.meetupTitle).toBe('Spec Driven Development & Context Engineering');
      expect(emailData.duration).toBe(60);
      expect(emailData.hostName).toBe('Rico Martinez');
      expect(emailData.zoomLink).toContain('zoom.us');

      expect(eventData.meetupTitle).toBe('Spec Driven Development & Context Engineering');
      expect(eventData.hostEmail).toBe('rico@learnermax.com');
      expect(eventData.nextOccurrence).toBeDefined();
    });

    it('prepareMeetupEmailData_meetupNotFound_throwsError', () => {
      const invalidEvent: MeetupSignupCompletedEvent = {
        ...mockEvent,
        meetupId: 'non-existent-meetup',
      };

      expect(() => prepareMeetupEmailData(invalidEvent)).toThrow(
        'Meetup not found: non-existent-meetup'
      );
    });

    it('prepareMeetupEmailData_calculatesNextOccurrence', () => {
      const { eventData, emailData } = prepareMeetupEmailData(mockEvent);

      // Next occurrence should be a valid ISO string
      expect(eventData.nextOccurrence).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Should be in the future
      const nextDate = new Date(eventData.nextOccurrence);
      expect(nextDate.getTime()).toBeGreaterThan(Date.now());

      // formattedDateTime should include day of week and time
      expect(emailData.formattedDateTime).toMatch(/Saturday/);
      expect(emailData.formattedDateTime).toMatch(/10:00/);
    });
  });
});
