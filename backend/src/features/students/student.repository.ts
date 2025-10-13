import { docClient } from '../../lib/dynamodb.js';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Student } from './student.types.js';

const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;

export const studentRepository = {
  async create(student: Student): Promise<void> {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${student.userId}`,
          SK: 'METADATA',
          GSI1PK: `USER#${student.userId}`,
          GSI1SK: 'METADATA',
          entityType: 'USER',
          ...student
        }
      })
    );
  },

  async get(userId: string): Promise<Student | undefined> {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'METADATA'
        }
      })
    );

    if (!result.Item) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, GSI1PK, GSI1SK, entityType, ...studentData } = result.Item;
    return studentData as Student;
  },

  async getByEmail(email: string): Promise<Student | undefined> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email
        }
      })
    );

    if (!result.Items || result.Items.length === 0) return undefined;

    const item = result.Items[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, GSI1PK, GSI1SK, entityType, ...studentData } = item;
    return studentData as Student;
  },

  async update(userId: string, updates: Partial<Student>): Promise<void> {
    const updateExpressions: string[] = [];
    const attributeNames: Record<string, string> = {};
    const attributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      updateExpressions.push(`#attr${index} = :val${index}`);
      attributeNames[`#attr${index}`] = key;
      attributeValues[`:val${index}`] = value;
    });

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'METADATA'
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributeValues
      })
    );
  }
};
