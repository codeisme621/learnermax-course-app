/**
 * Video Encoder Lambda Handler
 *
 * Triggered by S3 uploads to uploads/raw/ prefix.
 * Creates a MediaConvert job to transcode the video to HLS format.
 */

import type { S3Event, S3Handler } from 'aws-lambda';
import {
  MediaConvertClient,
  CreateJobCommand,
  DescribeEndpointsCommand,
} from '@aws-sdk/client-mediaconvert';
import { Logger } from '@aws-lambda-powertools/logger';
import {
  createJobSettings,
  parseUploadKey,
  generateOutputPrefix,
} from './mediaconvert-job.js';

const logger = new Logger({ serviceName: 'video-encoder' });

// Environment variables
const MEDIACONVERT_ROLE_ARN = process.env.MEDIACONVERT_ROLE_ARN!;
const VIDEO_BUCKET = process.env.VIDEO_BUCKET!;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// Cache the MediaConvert endpoint for Lambda warm starts
let mediaConvertEndpoint: string | null = null;

/**
 * Get the MediaConvert API endpoint.
 * The endpoint is account-specific and must be discovered via DescribeEndpoints.
 */
async function getMediaConvertEndpoint(): Promise<string> {
  if (mediaConvertEndpoint) {
    return mediaConvertEndpoint;
  }

  const client = new MediaConvertClient({ region: AWS_REGION });
  const command = new DescribeEndpointsCommand({ MaxResults: 1 });
  const response = await client.send(command);

  if (!response.Endpoints?.[0]?.Url) {
    throw new Error('Failed to get MediaConvert endpoint');
  }

  mediaConvertEndpoint = response.Endpoints[0].Url;
  logger.info('Discovered MediaConvert endpoint', { endpoint: mediaConvertEndpoint });

  return mediaConvertEndpoint;
}

/**
 * Create a MediaConvert client with the account-specific endpoint.
 */
async function createMediaConvertClient(): Promise<MediaConvertClient> {
  const endpoint = await getMediaConvertEndpoint();
  return new MediaConvertClient({
    region: AWS_REGION,
    endpoint,
  });
}

/**
 * Lambda handler for S3 video upload events.
 */
export const handler: S3Handler = async (event: S3Event) => {
  logger.info('Received S3 event', { records: event.Records.length });

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    logger.info('Processing video upload', { bucket, key });

    // Parse the upload key to get courseId and lessonId
    const parsed = parseUploadKey(key);
    if (!parsed) {
      logger.warn('Skipping file - does not match expected pattern uploads/raw/{courseId}/{lessonId}.ext', {
        key,
      });
      continue;
    }

    const { courseId, lessonId } = parsed;
    logger.info('Parsed upload key', { courseId, lessonId });

    // Generate output path for HLS files
    const outputPrefix = generateOutputPrefix(courseId, lessonId);
    logger.info('Will output HLS to', { outputPrefix });

    try {
      // Create MediaConvert client with discovered endpoint
      const mediaConvertClient = await createMediaConvertClient();

      // Create job settings
      const jobSettings = createJobSettings({
        inputBucket: bucket,
        inputKey: key,
        outputBucket: VIDEO_BUCKET,
        outputPrefix,
        roleArn: MEDIACONVERT_ROLE_ARN,
      });

      // Submit the encoding job
      const createJobCommand = new CreateJobCommand(jobSettings);
      const response = await mediaConvertClient.send(createJobCommand);

      logger.info('MediaConvert job created', {
        jobId: response.Job?.Id,
        status: response.Job?.Status,
        courseId,
        lessonId,
        outputPrefix,
      });
    } catch (error) {
      logger.error('Failed to create MediaConvert job', {
        error: error instanceof Error ? error.message : String(error),
        courseId,
        lessonId,
        key,
      });
      throw error;
    }
  }
};
