#!/usr/bin/env npx ts-node --esm

/**
 * Batch Video Encoding Script
 *
 * One-time migration script to encode all existing MP4 videos to HLS format.
 * This script copies videos to the uploads/raw/ prefix to trigger the
 * MediaConvert encoding pipeline.
 *
 * Usage:
 *   DRY_RUN=true npx ts-node --esm scripts/batch-encode-videos.ts  # Preview only
 *   npx ts-node --esm scripts/batch-encode-videos.ts               # Execute
 *
 * Environment Variables:
 *   VIDEO_BUCKET - S3 bucket name (default: learnermax-videos-preview)
 *   DRY_RUN - Set to 'true' to preview without executing
 *   AWS_REGION - AWS region (default: us-east-1)
 */

import { S3Client, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Configuration
const VIDEO_BUCKET = process.env.VIDEO_BUCKET || 'learnermax-videos-preview';
const TABLE_NAME = process.env.EDUCATION_TABLE_NAME || 'learnermax-education-preview';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DRY_RUN = process.env.DRY_RUN === 'true';

// AWS Clients
const s3Client = new S3Client({ region: AWS_REGION });
const ddbClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

interface Lesson {
  lessonId: string;
  courseId: string;
  title: string;
  videoKey: string;
  hlsManifestKey?: string;
}

/**
 * Get all lessons from DynamoDB
 */
async function getAllLessons(): Promise<Lesson[]> {
  console.log(`Scanning ${TABLE_NAME} for lessons...`);

  const result = await docClient.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'entityType = :type',
    ExpressionAttributeValues: {
      ':type': 'LESSON',
    },
  }));

  return (result.Items || []) as Lesson[];
}

/**
 * Check if a video file exists in S3
 */
async function videoExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: VIDEO_BUCKET,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy video to uploads/raw/ to trigger encoding pipeline
 */
async function triggerEncoding(lesson: Lesson): Promise<void> {
  // Extract filename from videoKey (e.g., "courses/spec-driven-dev-mini/History.mp4" -> "History.mp4")
  const sourceKey = lesson.videoKey;

  // Target: uploads/raw/{courseId}/{lessonId}.mp4
  // This naming is important - the encoding pipeline parses courseId/lessonId from this path
  const targetKey = `uploads/raw/${lesson.courseId}/${lesson.lessonId}.mp4`;

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would copy:`);
    console.log(`    From: ${sourceKey}`);
    console.log(`    To:   ${targetKey}`);
    return;
  }

  await s3Client.send(new CopyObjectCommand({
    Bucket: VIDEO_BUCKET,
    CopySource: `${VIDEO_BUCKET}/${sourceKey}`,
    Key: targetKey,
  }));

  console.log(`  Copied to ${targetKey}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Batch Video Encoding Migration');
  console.log('='.repeat(60));
  console.log(`Bucket: ${VIDEO_BUCKET}`);
  console.log(`Table: ${TABLE_NAME}`);
  console.log(`Dry Run: ${DRY_RUN}`);
  console.log('');

  // Get all lessons
  const lessons = await getAllLessons();
  console.log(`Found ${lessons.length} total lessons\n`);

  // Categorize lessons
  const alreadyMigrated: Lesson[] = [];
  const toMigrate: Lesson[] = [];
  const noVideo: Lesson[] = [];
  const missingSource: Lesson[] = [];

  for (const lesson of lessons) {
    if (lesson.hlsManifestKey) {
      alreadyMigrated.push(lesson);
    } else if (!lesson.videoKey) {
      noVideo.push(lesson);
    } else {
      // Check if source video exists
      const exists = await videoExists(lesson.videoKey);
      if (exists) {
        toMigrate.push(lesson);
      } else {
        missingSource.push(lesson);
      }
    }
  }

  console.log('Summary:');
  console.log(`  Already migrated (has hlsManifestKey): ${alreadyMigrated.length}`);
  console.log(`  No video (no videoKey): ${noVideo.length}`);
  console.log(`  Missing source file: ${missingSource.length}`);
  console.log(`  To migrate: ${toMigrate.length}`);
  console.log('');

  if (missingSource.length > 0) {
    console.log('WARNING: Missing source videos:');
    for (const lesson of missingSource) {
      console.log(`  - ${lesson.lessonId}: ${lesson.videoKey}`);
    }
    console.log('');
  }

  if (toMigrate.length === 0) {
    console.log('Nothing to migrate. All lessons are up to date!');
    return;
  }

  console.log('Lessons to migrate:');
  for (const lesson of toMigrate) {
    console.log(`  - ${lesson.lessonId} (${lesson.title})`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY RUN MODE] - No changes will be made\n');
  }

  // Trigger encoding for each lesson
  console.log('Starting encoding jobs...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const lesson of toMigrate) {
    console.log(`[${lesson.lessonId}] Triggering encoding...`);
    try {
      await triggerEncoding(lesson);
      successCount++;
      if (!DRY_RUN) {
        console.log(`[${lesson.lessonId}] ✓ Encoding triggered`);
      }
    } catch (error) {
      errorCount++;
      console.error(`[${lesson.lessonId}] ✗ Failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Migration Complete');
  console.log('='.repeat(60));
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);

  if (!DRY_RUN && successCount > 0) {
    console.log('\nNext steps:');
    console.log('1. Monitor MediaConvert console for job progress');
    console.log('   https://console.aws.amazon.com/mediaconvert/home?region=us-east-1#/jobs');
    console.log('2. After jobs complete, run: npx ts-node --esm scripts/verify-hls-encoding.ts');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
