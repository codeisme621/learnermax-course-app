import { SNSEvent, SNSHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger } from '../lib/logger.js';
import { createMetrics, MetricUnit } from '../lib/metrics.js';

const logger = createLogger('StudentOnboardingFunction');
const metrics = createMetrics('LearnerMax/Backend', 'StudentOnboardingFunction');

let docClient: DynamoDBDocumentClient;

const getDocClient = () => {
  if (!docClient) {
    const client = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
    });
  }
  return docClient;
};

interface StudentOnboardingMessage {
  userId: string;
  email: string;
  name: string;
  signUpMethod: 'email' | 'google';
  timestamp: string;
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  logger.info('Student Onboarding Lambda triggered', {
    recordCount: event.Records.length,
  });

  const tableName = process.env.EDUCATION_TABLE_NAME!;
  const client = getDocClient();

  for (const record of event.Records) {
    try {
      const message: StudentOnboardingMessage = JSON.parse(record.Sns.Message);
      logger.info('Processing student onboarding', {
        userId: message.userId,
        email: message.email,
        signUpMethod: message.signUpMethod,
      });

      const now = new Date().toISOString();

      // Create student record in EducationTable using single-table design
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            PK: `USER#${message.userId}`,
            SK: 'METADATA',
            GSI1PK: `USER#${message.userId}`,
            GSI1SK: 'METADATA',
            entityType: 'USER',
            email: message.email, // For email-index GSI
            userId: message.userId,
            name: message.name,
            signUpMethod: message.signUpMethod,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          },
          ConditionExpression: 'attribute_not_exists(PK)', // Prevent duplicates
        })
      );

      logger.info('Successfully created student record', {
        userId: message.userId,
        email: message.email,
        signUpMethod: message.signUpMethod,
      });

      // Business Metric: User Registration Success
      metrics.addMetric('UserRegistrationSuccess', MetricUnit.Count, 1);
      metrics.addDimension('signUpMethod', message.signUpMethod);

      // Technical Metric: DynamoDB Success
      // Note: AWS provides UserErrors/SystemErrors in AWS/DynamoDB namespace
      // We track this for operation-level success tracking
      metrics.addMetric('DynamoDBPutSuccess', MetricUnit.Count, 1);
    } catch (error: unknown) {
      // If student already exists, log but don't fail
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
        const message: StudentOnboardingMessage = JSON.parse(record.Sns.Message);
        logger.info('Student already exists, skipping', {
          userId: message.userId,
          email: message.email,
        });

        // Technical Metric: Duplicate User Detected
        metrics.addMetric('DuplicateUserDetected', MetricUnit.Count, 1);
        continue;
      }

      // Business Metric: User Registration Failure
      metrics.addMetric('UserRegistrationFailure', MetricUnit.Count, 1);

      // Technical Metric: DynamoDB Failure
      metrics.addMetric('DynamoDBPutFailure', MetricUnit.Count, 1);

      logger.error('Error processing student onboarding', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        snsMessageId: record.Sns.MessageId,
      });
      // Throw error to trigger SNS retry and eventually send to DLQ
      throw error;
    }
  }

  // Publish all metrics at the end
  metrics.publishStoredMetrics();
};
