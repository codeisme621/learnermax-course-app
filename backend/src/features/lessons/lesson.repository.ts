import { docClient } from '../../lib/dynamodb.js';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { LessonEntity } from './lesson.entity.js';
import type { Lesson } from './lesson.types.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('LessonRepository');

// Helper function to get table name at runtime (makes testing easier)
const getTableName = (): string => {
  const tableName = process.env.EDUCATION_TABLE_NAME;
  if (!tableName) {
    throw new Error('EDUCATION_TABLE_NAME environment variable is not set');
  }
  return tableName;
};

/**
 * Lesson Repository - DynamoDB access layer for lesson entities
 */
export const lessonRepository = {
  /**
   * Get all lessons for a course
   * @param courseId - The course ID
   * @returns Array of lessons (sorted by order field in-memory)
   */
  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    const queryParams = {
      TableName: getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `COURSE#${courseId}`,
        ':skPrefix': 'LESSON#',
      },
    };

    logger.info('[getLessonsByCourse] Querying lessons from DynamoDB', {
      courseId,
      queryParams,
    });

    const result = await docClient.send(new QueryCommand(queryParams));

    if (!result.Items || result.Items.length === 0) {
      logger.warn('[getLessonsByCourse] No lessons found', { courseId });
      return [];
    }

    logger.info('[getLessonsByCourse] Lessons found', {
      courseId,
      count: result.Items.length,
    });

    // Strip DynamoDB keys and convert to domain model
    const lessons = result.Items.map((item) => {
      const { PK, SK, GSI1PK, GSI1SK, entityType, ...lessonData } =
        item as LessonEntity;
      return lessonData as Lesson;
    });

    // Sort by order field (ascending)
    return lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  /**
   * Get a specific lesson by lessonId
   * Uses GSI1 to query by lessonId directly
   * @param lessonId - The lesson ID
   * @returns Lesson or undefined if not found
   */
  async getLesson(lessonId: string): Promise<Lesson | undefined> {
    const queryParams = {
      TableName: getTableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `LESSON#${lessonId}`,
      },
      Limit: 1, // We expect only one lesson per lessonId
    };

    logger.info('[getLesson] Fetching lesson from DynamoDB', {
      lessonId,
      queryParams,
    });

    const result = await docClient.send(new QueryCommand(queryParams));

    if (!result.Items || result.Items.length === 0) {
      logger.warn('[getLesson] Lesson not found in DynamoDB', { lessonId });
      return undefined;
    }

    const item = result.Items[0] as LessonEntity;

    // Strip DynamoDB keys before returning
    const { PK, SK, GSI1PK, GSI1SK, entityType, ...lessonData } = item;
    logger.info('[getLesson] Lesson found', { lessonId });
    return lessonData as Lesson;
  },

  /**
   * Get total count of lessons for a course
   * @param courseId - The course ID
   * @returns Count of lessons
   */
  async getTotalLessons(courseId: string): Promise<number> {
    const queryParams = {
      TableName: getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `COURSE#${courseId}`,
        ':skPrefix': 'LESSON#',
      },
      Select: 'COUNT' as const, // Only count, don't return items
    };

    logger.info('[getTotalLessons] Counting lessons from DynamoDB', {
      courseId,
    });

    const result = await docClient.send(new QueryCommand(queryParams));
    const count = result.Count || 0;

    logger.info('[getTotalLessons] Lesson count', { courseId, count });
    return count;
  },
};
