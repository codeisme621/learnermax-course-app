import { docClient } from '../../lib/dynamodb.js';
import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Enrollment } from './enrollment.types.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('EnrollmentRepository');
const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;

export const enrollmentRepository = {
  async create(enrollment: Enrollment): Promise<void> {
    const item = {
      PK: `USER#${enrollment.userId}`,
      SK: `COURSE#${enrollment.courseId}`,
      GSI1PK: `COURSE#${enrollment.courseId}`,
      GSI1SK: `USER#${enrollment.userId}`,
      entityType: 'ENROLLMENT',
      ...enrollment
    };

    logger.info('[create] Creating enrollment in DynamoDB', {
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      tableName: TABLE_NAME,
      keys: {
        PK: item.PK,
        SK: item.SK,
        GSI1PK: item.GSI1PK,
        GSI1SK: item.GSI1SK
      },
      enrollmentType: enrollment.enrollmentType,
      paymentStatus: enrollment.paymentStatus
    });

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)'
      })
    );

    logger.info('[create] Enrollment created successfully', {
      userId: enrollment.userId,
      courseId: enrollment.courseId
    });
  },

  async get(userId: string, courseId: string): Promise<Enrollment | undefined> {
    const key = {
      PK: `USER#${userId}`,
      SK: `COURSE#${courseId}`
    };

    logger.info('[get] Fetching enrollment from DynamoDB', {
      userId,
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
      logger.warn('[get] Enrollment not found in DynamoDB', { userId, courseId });
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { PK, SK, GSI1PK, GSI1SK, entityType, ...enrollmentData } = result.Item;
    logger.info('[get] Enrollment found', {
      userId,
      courseId,
      enrollmentType: enrollmentData.enrollmentType,
      paymentStatus: enrollmentData.paymentStatus
    });
    return enrollmentData as Enrollment;
  },

  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'COURSE#'
      }
    };

    logger.info('[getUserEnrollments] Querying user enrollments from DynamoDB', {
      userId,
      tableName: TABLE_NAME,
      pk: queryParams.ExpressionAttributeValues[':pk'],
      skPrefix: queryParams.ExpressionAttributeValues[':sk']
    });

    const result = await docClient.send(new QueryCommand(queryParams));

    const itemCount = result.Items?.length || 0;
    logger.info('[getUserEnrollments] Query result', {
      userId,
      itemCount,
      scannedCount: result.ScannedCount,
      consumedCapacity: result.ConsumedCapacity
    });

    if (itemCount === 0) {
      logger.warn('[getUserEnrollments] No enrollments found for user', { userId });
      return [];
    }

    const enrollments = (result.Items || []).map(item => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { PK, SK, GSI1PK, GSI1SK, entityType, ...enrollmentData } = item;
      return enrollmentData as Enrollment;
    });

    logger.info('[getUserEnrollments] Enrollments mapped successfully', {
      userId,
      courseIds: enrollments.map(e => e.courseId)
    });

    return enrollments;
  }
};
