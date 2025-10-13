import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SNSEvent, Context, Callback } from 'aws-lambda';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { handler } from '../student-onboarding.js';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Student Onboarding Lambda', () => {
  const mockContext = {} as Context;
  const mockCallback = {} as Callback;

  beforeEach(() => {
    ddbMock.reset();
    process.env.EDUCATION_TABLE_NAME = 'test-education-table';
  });

  it('should create student record in DynamoDB', async () => {
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

    ddbMock.on(PutCommand).resolves({});

    await handler(event, mockContext, mockCallback);

    expect(ddbMock.calls()).toHaveLength(1);
    const putCall = ddbMock.call(0);
    const input = putCall.args[0].input as { TableName?: string; Item?: unknown };
    expect(input.TableName).toBe('test-education-table');
    expect(input.Item).toMatchObject({
      PK: 'USER#user-123',
      SK: 'METADATA',
      entityType: 'USER',
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      signUpMethod: 'email',
      emailVerified: true,
    });
  });

  it('should skip if student already exists', async () => {
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

    const conditionalCheckError = new ConditionalCheckFailedException({
      message: 'The conditional request failed',
      $metadata: {},
    });

    ddbMock.on(PutCommand).rejects(conditionalCheckError);

    // Should not throw - just log and continue
    await expect(handler(event, mockContext, mockCallback)).resolves.not.toThrow();
  });

  it('should throw error if DynamoDB put fails with other error', async () => {
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

    ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'));

    await expect(handler(event, mockContext, mockCallback)).rejects.toThrow('DynamoDB error');
  });
});
