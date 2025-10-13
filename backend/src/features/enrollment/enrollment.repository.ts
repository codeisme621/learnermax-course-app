import { docClient } from '../../lib/dynamodb.js';
import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Enrollment } from './enrollment.types.js';

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;

export const enrollmentRepository = {
  async create(enrollment: Enrollment): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${enrollment.userId}`,
          SK: `COURSE#${enrollment.courseId}`,
          GSI1PK: `COURSE#${enrollment.courseId}`,
          GSI1SK: `USER#${enrollment.userId}`,
          entityType: 'ENROLLMENT',
          ...enrollment
        },
        ConditionExpression: 'attribute_not_exists(PK)'
      })
    );
  },

  async get(userId: string, courseId: string): Promise<Enrollment | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: `COURSE#${courseId}`
        }
      })
    );

    if (!result.Item) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, GSI1PK, GSI1SK, entityType, ...enrollmentData } = result.Item;
    return enrollmentData as Enrollment;
  },

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'COURSE#'
        }
      })
    );

    return (result.Items || []).map(item => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { PK, SK, GSI1PK, GSI1SK, entityType, ...enrollmentData } = item;
      return enrollmentData as Enrollment;
    });
  }
};
