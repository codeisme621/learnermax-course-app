import { docClient } from '../../lib/dynamodb.js';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Feedback } from './feedback.types.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('FeedbackRepository');
const TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;

export const feedbackRepository = {
  async create(feedback: Feedback): Promise<void> {
    const item = {
      PK: `FEEDBACK#${feedback.feedbackId}`,
      SK: 'METADATA',
      GSI1PK: 'FEEDBACK',
      GSI1SK: feedback.createdAt,
      entityType: 'FEEDBACK',
      ...feedback
    };

    logger.info('[create] Creating feedback in DynamoDB', {
      feedbackId: feedback.feedbackId,
      userId: feedback.userId,
      category: feedback.category,
      tableName: TABLE_NAME,
      keys: {
        PK: item.PK,
        SK: item.SK,
        GSI1PK: item.GSI1PK,
        GSI1SK: item.GSI1SK
      }
    });

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      })
    );

    logger.info('[create] Feedback created successfully', {
      feedbackId: feedback.feedbackId,
      userId: feedback.userId
    });
  }
};
