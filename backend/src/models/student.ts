import { PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../lib/dynamodb.js';

const STUDENTS_TABLE = process.env.STUDENTS_TABLE_NAME!;

export interface Student {
  userId: string;
  email: string;
  name: string;
  signUpMethod: 'email' | 'google';
  enrolledCourses: string[];
  createdAt: string;
  updatedAt: string;
}

export const createStudent = async (
  studentData: Omit<Student, 'createdAt' | 'updatedAt'>
): Promise<Student> => {
  const now = new Date().toISOString();
  const student: Student = {
    ...studentData,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: STUDENTS_TABLE,
      Item: student,
      ConditionExpression: 'attribute_not_exists(userId)', // Prevent duplicates
    })
  );

  return student;
};

export const getStudentByUserId = async (userId: string): Promise<Student | null> => {
  const result = await docClient.send(
    new GetCommand({
      TableName: STUDENTS_TABLE,
      Key: { userId },
    })
  );

  return (result.Item as Student) || null;
};

export const getStudentByEmail = async (email: string): Promise<Student | null> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: STUDENTS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    })
  );

  return (result.Items?.[0] as Student) || null;
};

export const updateStudent = async (
  userId: string,
  updates: Partial<Pick<Student, 'name' | 'enrolledCourses'>>
): Promise<Student> => {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, string | string[]> = {};

  // Build update expression dynamically
  if (updates.name !== undefined) {
    updateExpressions.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = updates.name;
  }

  if (updates.enrolledCourses !== undefined) {
    updateExpressions.push('enrolledCourses = :enrolledCourses');
    expressionAttributeValues[':enrolledCourses'] = updates.enrolledCourses;
  }

  // Always update updatedAt
  updateExpressions.push('updatedAt = :updatedAt');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: STUDENTS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0
        ? expressionAttributeNames
        : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as Student;
};
