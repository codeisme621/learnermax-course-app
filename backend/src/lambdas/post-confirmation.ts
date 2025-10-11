import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda';
import { createLogger } from '../lib/logger.js';
import { createMetrics, MetricUnit } from '../lib/metrics.js';

const logger = createLogger('PostConfirmationFunction');
const metrics = createMetrics('LearnerMax/Backend', 'PostConfirmationFunction');

let snsClient: SNSClient;

const getSnsClient = () => {
  if (!snsClient) {
    snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }
  return snsClient;
};

interface StudentOnboardingMessage {
  userId: string;
  email: string;
  name: string;
  signUpMethod: 'email' | 'google';
  timestamp: string;
}

export const handler: PostConfirmationTriggerHandler = async (
  event: PostConfirmationTriggerEvent
) => {
  const startTime = Date.now();

  logger.info('PostConfirmation event received', {
    userName: event.userName,
    userPoolId: event.userPoolId,
    triggerSource: event.triggerSource,
  });

  const topicArn = process.env.SNS_TOPIC_ARN!;
  const client = getSnsClient();

  try {
    const { userName, request } = event;
    const userAttributes = request.userAttributes;

    // Determine sign-up method
    // Check if userName starts with Google_ or contains Google provider
    const signUpMethod = userName.includes('Google_') || userName.includes('google_') ? 'google' : 'email';

    // Extract user details
    const message: StudentOnboardingMessage = {
      userId: userAttributes.sub,
      email: userAttributes.email,
      name: userAttributes.name || userAttributes.email,
      signUpMethod,
      timestamp: new Date().toISOString(),
    };

    logger.info('Publishing student onboarding event', {
      userId: message.userId,
      email: message.email,
      signUpMethod: message.signUpMethod,
    });

    // Publish to SNS topic
    await client.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(message),
        Subject: 'New Student Onboarding',
        MessageAttributes: {
          userId: {
            DataType: 'String',
            StringValue: message.userId,
          },
          signUpMethod: {
            DataType: 'String',
            StringValue: message.signUpMethod,
          },
        },
      })
    );

    logger.info('Successfully published to SNS', {
      userId: message.userId,
      topicArn,
    });

    // Technical Metrics: SNS Publish Success
    // Note: AWS provides NumberOfMessagesPublished in AWS/SNS namespace
    // We track this for operation-level success tracking
    metrics.addMetric('SNSPublishSuccess', MetricUnit.Count, 1);

    return event; // Return event to complete Cognito flow
  } catch (error) {
    logger.error('Error in PostConfirmation Lambda', {
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    // Technical Metrics: SNS Publish Failure
    metrics.addMetric('SNSPublishFailure', MetricUnit.Count, 1);

    // Don't throw - we don't want to block user sign-up
    // Error will be logged in CloudWatch for investigation
    return event;
  } finally {
    // Publish all metrics
    // Note: Lambda execution time is automatically tracked by AWS as "Duration" metric in AWS/Lambda namespace
    metrics.publishStoredMetrics();
  }
};
