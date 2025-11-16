import { docClient } from '../../lib/dynamodb.js';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { ProgressResponse } from './progress.types.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('ProgressRepository');

/**
 * Get table name from environment with validation
 */
const getTableName = (): string => {
  const tableName = process.env.EDUCATION_TABLE_NAME;
  if (!tableName) {
    throw new Error('EDUCATION_TABLE_NAME environment variable is not set');
  }
  return tableName;
};

/**
 * Progress entity as stored in DynamoDB
 * Includes DynamoDB keys (PK, SK, GSI1PK, GSI1SK)
 */
export interface ProgressEntity {
  PK: string;                  // "STUDENT#<studentId>"
  SK: string;                  // "PROGRESS#<courseId>"
  GSI1PK?: string;             // Optional: "COURSE#<courseId>" for querying all students in course
  GSI1SK?: string;             // Optional: "STUDENT#<studentId>"
  entityType: string;          // "PROGRESS"
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;
  totalLessons: number;
  updatedAt: string;
}

/**
 * Progress repository - DynamoDB access layer
 */
export const progressRepository = {
  /**
   * Get student's progress for a specific course
   * Returns undefined if no progress exists (student hasn't started course)
   */
  async getProgress(studentId: string, courseId: string): Promise<ProgressResponse | undefined> {
    const key = {
      PK: `STUDENT#${studentId}`,
      SK: `PROGRESS#${courseId}`,
    };

    logger.info('[getProgress] Fetching progress from DynamoDB', {
      studentId,
      courseId,
      tableName: getTableName(),
      key,
    });

    const result = await docClient.send(
      new GetCommand({
        TableName: getTableName(),
        Key: key,
      })
    );

    if (!result.Item) {
      logger.warn('[getProgress] Progress not found in DynamoDB', { studentId, courseId });
      return undefined;
    }

    const { PK, SK, GSI1PK, GSI1SK, entityType, ...progressData } = result.Item as ProgressEntity;

    logger.info('[getProgress] Progress found', {
      studentId,
      courseId,
      completedCount: progressData.completedLessons.length,
      percentage: progressData.percentage,
    });

    return progressData as ProgressResponse;
  },

  /**
   * Save or update student's progress for a course (upsert)
   * Uses UpdateCommand with SET expression for atomic updates
   */
  async saveProgress(
    studentId: string,
    courseId: string,
    data: {
      completedLessons: string[];
      lastAccessedLesson: string;
      percentage: number;
      totalLessons: number;
    }
  ): Promise<ProgressResponse> {
    const key = {
      PK: `STUDENT#${studentId}`,
      SK: `PROGRESS#${courseId}`,
    };

    const now = new Date().toISOString();

    logger.info('[saveProgress] Saving progress to DynamoDB', {
      studentId,
      courseId,
      tableName: getTableName(),
      key,
      completedCount: data.completedLessons.length,
      percentage: data.percentage,
    });

    const result = await docClient.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: key,
        UpdateExpression:
          'SET completedLessons = :cl, lastAccessedLesson = :last, percentage = :pct, totalLessons = :total, updatedAt = :now, courseId = :courseId, entityType = :entityType',
        ExpressionAttributeValues: {
          ':cl': data.completedLessons,
          ':last': data.lastAccessedLesson,
          ':pct': data.percentage,
          ':total': data.totalLessons,
          ':now': now,
          ':courseId': courseId,
          ':entityType': 'PROGRESS',
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    logger.info('[saveProgress] Progress saved successfully', {
      studentId,
      courseId,
      completedCount: data.completedLessons.length,
      percentage: data.percentage,
    });

    const { PK, SK, GSI1PK, GSI1SK, entityType, ...progressData } =
      result.Attributes as ProgressEntity;

    return progressData as ProgressResponse;
  },
};
