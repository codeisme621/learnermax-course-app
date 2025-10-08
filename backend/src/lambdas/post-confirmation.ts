import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda';

const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN!;

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
  console.log('PostConfirmation event:', JSON.stringify(event, null, 2));

  try {
    const { userPoolId, userName, request } = event;
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

    console.log('Publishing student onboarding event:', message);

    // Publish to SNS topic
    await snsClient.send(
      new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
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

    console.log('Successfully published to SNS');

    return event; // Return event to complete Cognito flow
  } catch (error) {
    console.error('Error in PostConfirmation Lambda:', error);
    // Don't throw - we don't want to block user sign-up
    // Error will be logged in CloudWatch for investigation
    return event;
  }
};
