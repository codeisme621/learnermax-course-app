import { mockClient } from 'aws-sdk-client-mock';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { PostConfirmationTriggerEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../post-confirmation.js';

const snsMock = mockClient(SNSClient);

describe('PostConfirmation Lambda', () => {
  const mockContext = {} as Context;
  const mockCallback = {} as Callback;

  beforeEach(() => {
    snsMock.reset();
    process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-topic';
  });

  it('should publish SNS message for email sign-up', async () => {
    const event: PostConfirmationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_XXXXXXXXX',
      userName: 'test-user',
      callerContext: {
        awsSdkVersion: '1',
        clientId: 'test-client-id',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          email_verified: 'true',
        },
      },
      response: {},
    };

    snsMock.on(PublishCommand).resolves({});

    const result = await handler(event, mockContext, mockCallback);

    expect(result).toEqual(event);
    expect(snsMock.calls()).toHaveLength(1);

    const publishCall = snsMock.call(0);
    const message = JSON.parse(publishCall.args[0].input.Message!);

    expect(message).toMatchObject({
      userId: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      signUpMethod: 'email',
    });
  });

  it('should identify Google sign-up correctly', async () => {
    const event: PostConfirmationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_XXXXXXXXX',
      userName: 'google_123456',
      callerContext: {
        awsSdkVersion: '1',
        clientId: 'test-client-id',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user-456',
          email: 'google@example.com',
          name: 'Google User',
          email_verified: 'true',
        },
      },
      response: {},
    };

    snsMock.on(PublishCommand).resolves({});

    await handler(event, mockContext, mockCallback);

    const publishCall = snsMock.call(0);
    const message = JSON.parse(publishCall.args[0].input.Message!);

    expect(message.signUpMethod).toBe('google');
  });

  it('should not throw error if SNS publish fails', async () => {
    const event: PostConfirmationTriggerEvent = {
      version: '1',
      region: 'us-east-1',
      userPoolId: 'us-east-1_XXXXXXXXX',
      userName: 'test-user',
      callerContext: {
        awsSdkVersion: '1',
        clientId: 'test-client-id',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      },
      response: {},
    };

    snsMock.on(PublishCommand).rejects(new Error('SNS error'));

    // Should not throw - just log error
    const result = await handler(event, mockContext, mockCallback);
    expect(result).toEqual(event);
  });
});
