import { docClient } from '../../lib/dynamodb.js';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Course } from './course.types.js';

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;

export const courseRepository = {
  async create(course: Course): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `COURSE#${course.courseId}`,
          SK: 'METADATA',
          GSI1PK: 'COURSE',
          GSI1SK: `COURSE#${course.courseId}`,
          entityType: 'COURSE',
          ...course
        }
      })
    );
  },

  async get(courseId: string): Promise<Course | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `COURSE#${courseId}`,
          SK: 'METADATA'
        }
      })
    );

    if (!result.Item) return undefined;

    // Extract course data (remove DynamoDB keys)
    const { PK, SK, GSI1PK, GSI1SK, entityType, ...courseData } = result.Item;
    return courseData as Course;
  },

  async getAll(): Promise<Course[]> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'COURSE'
        }
      })
    );

    return (result.Items || []).map(item => {
      const { PK, SK, GSI1PK, GSI1SK, entityType, ...courseData } = item;
      return courseData as Course;
    });
  }
};
