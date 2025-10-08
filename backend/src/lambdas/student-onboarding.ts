import { SNSEvent, SNSHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

const STUDENTS_TABLE_NAME = process.env.STUDENTS_TABLE_NAME!;

interface StudentOnboardingMessage {
  userId: string;
  email: string;
  name: string;
  signUpMethod: 'email' | 'google';
  timestamp: string;
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  console.log('Student Onboarding Lambda triggered:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const message: StudentOnboardingMessage = JSON.parse(record.Sns.Message);
      console.log('Processing student onboarding:', message);

      const now = new Date().toISOString();

      // Create student record directly in DynamoDB
      await docClient.send(
        new PutCommand({
          TableName: STUDENTS_TABLE_NAME,
          Item: {
            userId: message.userId,
            email: message.email,
            name: message.name,
            signUpMethod: message.signUpMethod,
            enrolledCourses: [],
            createdAt: now,
            updatedAt: now,
          },
          ConditionExpression: 'attribute_not_exists(userId)', // Prevent duplicates
        })
      );

      console.log('Successfully created student record for:', message.email);
    } catch (error: any) {
      // If student already exists, log but don't fail
      if (error.name === 'ConditionalCheckFailedException') {
        console.log('Student already exists:', record.Sns.Message);
        continue;
      }

      console.error('Error processing student onboarding:', error);
      // Throw error to trigger SNS retry and eventually send to DLQ
      throw error;
    }
  }
};
