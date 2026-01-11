/**
 * Update Lesson Metadata Handler
 *
 * Triggered by EventBridge when a MediaConvert job completes.
 * Updates the lesson's DynamoDB record with the hlsManifestKey.
 */

import type { EventBridgeHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { generateHlsManifestKey } from './mediaconvert-job.js';

const logger = new Logger({ serviceName: 'update-lesson-metadata' });

// Environment variables
const EDUCATION_TABLE_NAME = process.env.EDUCATION_TABLE_NAME!;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// DynamoDB client
const ddbClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

/**
 * MediaConvert Job State Change event detail.
 */
interface MediaConvertJobStateChangeDetail {
  status: 'COMPLETE' | 'ERROR' | 'PROGRESSING' | 'SUBMITTED';
  jobId: string;
  userMetadata?: {
    inputKey?: string;
    outputPrefix?: string;
  };
  outputGroupDetails?: Array<{
    outputDetails: Array<{
      outputFilePaths: string[];
    }>;
  }>;
}

/**
 * Extract courseId and lessonId from the outputPrefix.
 * Expected format: courses/{courseId}/{lessonId}
 */
function parseOutputPrefix(outputPrefix: string): { courseId: string; lessonId: string } | null {
  const match = outputPrefix.match(/^courses\/([^/]+)\/([^/]+)$/);
  if (!match) {
    return null;
  }
  return {
    courseId: match[1],
    lessonId: match[2],
  };
}

/**
 * Update the lesson record in DynamoDB with the HLS manifest key.
 */
async function updateLessonHlsManifestKey(
  courseId: string,
  lessonId: string,
  hlsManifestKey: string
): Promise<void> {
  const command = new UpdateCommand({
    TableName: EDUCATION_TABLE_NAME,
    Key: {
      PK: `COURSE#${courseId}`,
      SK: `LESSON#${lessonId}`,
    },
    UpdateExpression: 'SET hlsManifestKey = :hlsManifestKey, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':hlsManifestKey': hlsManifestKey,
      ':updatedAt': new Date().toISOString(),
    },
    ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)',
  });

  await docClient.send(command);
}

/**
 * EventBridge handler for MediaConvert job state changes.
 */
export const handler: EventBridgeHandler<'MediaConvert Job State Change', MediaConvertJobStateChangeDetail, void> = async (event) => {
  logger.info('Received MediaConvert job state change event', {
    status: event.detail.status,
    jobId: event.detail.jobId,
  });

  // Only process completed jobs
  if (event.detail.status !== 'COMPLETE') {
    logger.info('Ignoring non-complete job', { status: event.detail.status });
    return;
  }

  // Get outputPrefix from user metadata
  const outputPrefix = event.detail.userMetadata?.outputPrefix;
  if (!outputPrefix) {
    logger.error('No outputPrefix in userMetadata', { jobId: event.detail.jobId });
    throw new Error('Missing outputPrefix in job userMetadata');
  }

  // Parse courseId and lessonId from outputPrefix
  const parsed = parseOutputPrefix(outputPrefix);
  if (!parsed) {
    logger.error('Failed to parse outputPrefix', { outputPrefix });
    throw new Error(`Invalid outputPrefix format: ${outputPrefix}`);
  }

  const { courseId, lessonId } = parsed;
  const hlsManifestKey = generateHlsManifestKey(courseId, lessonId);

  logger.info('Updating lesson with HLS manifest key', {
    courseId,
    lessonId,
    hlsManifestKey,
    jobId: event.detail.jobId,
  });

  try {
    await updateLessonHlsManifestKey(courseId, lessonId, hlsManifestKey);

    logger.info('Successfully updated lesson hlsManifestKey', {
      courseId,
      lessonId,
      hlsManifestKey,
    });
  } catch (error) {
    // Check if it's a condition check failure (lesson doesn't exist)
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      logger.warn('Lesson not found in DynamoDB - may be a test upload', {
        courseId,
        lessonId,
      });
      return;
    }

    logger.error('Failed to update lesson metadata', {
      error: error instanceof Error ? error.message : String(error),
      courseId,
      lessonId,
    });
    throw error;
  }
};
