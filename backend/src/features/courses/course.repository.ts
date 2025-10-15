import { docClient } from '../../lib/dynamodb.js';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Course } from './course.types.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('CourseRepository');
const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;

export const courseRepository = {
  async create(course: Course): Promise<void> {
    const item = {
      PK: `COURSE#${course.courseId}`,
      SK: 'METADATA',
      entityType: 'COURSE',
      ...course,
      // Set GSI keys after spread to ensure they're not overwritten
      GSI1PK: 'COURSE',
      GSI1SK: `COURSE#${course.courseId}`
    };

    logger.info('[create] Creating course in DynamoDB', {
      courseId: course.courseId,
      tableName: TABLE_NAME,
      keys: { PK: item.PK, SK: item.SK, GSI1PK: item.GSI1PK, GSI1SK: item.GSI1SK }
    });

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      })
    );

    logger.info('[create] Course created successfully', { courseId: course.courseId });
  },

  async get(courseId: string): Promise<Course | undefined> {
    const key = {
      PK: `COURSE#${courseId}`,
      SK: 'METADATA'
    };

    logger.info('[get] Fetching course from DynamoDB', {
      courseId,
      tableName: TABLE_NAME,
      key
    });

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: key
      })
    );

    if (!result.Item) {
      logger.warn('[get] Course not found in DynamoDB', { courseId });
      return undefined;
    }

    // Extract course data (remove DynamoDB keys)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, GSI1PK, GSI1SK, entityType, ...courseData } = result.Item;
    logger.info('[get] Course found', { courseId });
    return courseData as Course;
  },

  async getAll(): Promise<Course[]> {
    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'COURSE'
      }
    };

    logger.info('[getAll] Querying all courses from DynamoDB', {
      tableName: TABLE_NAME,
      indexName: 'GSI1',
      gsi1pk: 'COURSE'
    });

    const result = await docClient.send(new QueryCommand(queryParams));

    const itemCount = result.Items?.length || 0;
    logger.info('[getAll] Query result', {
      itemCount,
      scannedCount: result.ScannedCount,
      consumedCapacity: result.ConsumedCapacity
    });

    if (itemCount === 0) {
      logger.warn('[getAll] No courses found in DynamoDB with GSI1PK=COURSE');
      return [];
    }

    const courses = (result.Items || []).map(item => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { PK, SK, GSI1PK, GSI1SK, entityType, ...courseData } = item;
      return courseData as Course;
    });

    logger.info('[getAll] Courses mapped successfully', {
      courseIds: courses.map(c => c.courseId)
    });

    return courses;
  }
};
