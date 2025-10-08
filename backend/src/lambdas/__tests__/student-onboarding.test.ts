import { jest } from '@jest/globals';
import { SNSEvent, Context, Callback } from 'aws-lambda';

// Set env var before importing handler
process.env.API_ENDPOINT = 'https://api.example.com';

import { handler } from '../student-onboarding.js';

// Mock fetch
const mockFetch = jest.fn<typeof fetch>();
global.fetch = mockFetch;

describe('Student Onboarding Lambda', () => {
  const mockContext = {} as Context;
  const mockCallback = {} as Callback;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should call Student API to create student record', async () => {
    const event: SNSEvent = {
      Records: [
        {
          EventSource: 'aws:sns',
          EventVersion: '1.0',
          EventSubscriptionArn: 'arn:aws:sns:...',
          Sns: {
            Type: 'Notification',
            MessageId: 'msg-123',
            TopicArn: 'arn:aws:sns:us-east-1:123456789012:topic',
            Subject: 'New Student Onboarding',
            Message: JSON.stringify({
              userId: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              signUpMethod: 'email',
              timestamp: '2025-01-01T00:00:00.000Z',
            }),
            Timestamp: '2025-01-01T00:00:00.000Z',
            SignatureVersion: '1',
            Signature: 'signature',
            SigningCertUrl: 'https://...',
            UnsubscribeUrl: 'https://...',
            MessageAttributes: {},
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        signUpMethod: 'email',
        enrolledCourses: [],
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      }),
    } as Response);

    await handler(event, mockContext, mockCallback);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/students',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          signUpMethod: 'email',
          enrolledCourses: [],
        }),
      }
    );
  });

  it('should throw error if Student API call fails', async () => {
    const event: SNSEvent = {
      Records: [
        {
          EventSource: 'aws:sns',
          EventVersion: '1.0',
          EventSubscriptionArn: 'arn:aws:sns:...',
          Sns: {
            Type: 'Notification',
            MessageId: 'msg-123',
            TopicArn: 'arn:aws:sns:us-east-1:123456789012:topic',
            Subject: 'New Student Onboarding',
            Message: JSON.stringify({
              userId: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              signUpMethod: 'email',
              timestamp: '2025-01-01T00:00:00.000Z',
            }),
            Timestamp: '2025-01-01T00:00:00.000Z',
            SignatureVersion: '1',
            Signature: 'signature',
            SigningCertUrl: 'https://...',
            UnsubscribeUrl: 'https://...',
            MessageAttributes: {},
          },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response);

    await expect(handler(event, mockContext, mockCallback)).rejects.toThrow();
  });
});
