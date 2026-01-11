#!/usr/bin/env npx ts-node --esm

/**
 * HLS Encoding Verification Script
 *
 * Verifies that all lessons have been successfully encoded to HLS format.
 * Checks both DynamoDB (hlsManifestKey) and S3 (manifest files exist).
 *
 * Usage:
 *   npx ts-node --esm scripts/verify-hls-encoding.ts
 *
 * Environment Variables:
 *   VIDEO_BUCKET - S3 bucket name (default: learnermax-videos-preview)
 *   AWS_REGION - AWS region (default: us-east-1)
 */

import { S3Client, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Configuration
const VIDEO_BUCKET = process.env.VIDEO_BUCKET || 'learnermax-videos-preview';
const TABLE_NAME = process.env.EDUCATION_TABLE_NAME || 'learnermax-education-preview';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// AWS Clients
const s3Client = new S3Client({ region: AWS_REGION });
const ddbClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

interface Lesson {
  lessonId: string;
  courseId: string;
  title: string;
  videoKey?: string;
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
 * Check if a file exists in S3
 */
async function fileExists(key: string): Promise<boolean> {
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
 * List files in an S3 prefix
 */
async function listFiles(prefix: string): Promise<string[]> {
  const result = await s3Client.send(new ListObjectsV2Command({
    Bucket: VIDEO_BUCKET,
    Prefix: prefix,
    MaxKeys: 100,
  }));

  return (result.Contents || []).map(obj => obj.Key!);
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('HLS Encoding Verification');
  console.log('='.repeat(60));
  console.log(`Bucket: ${VIDEO_BUCKET}`);
  console.log(`Table: ${TABLE_NAME}`);
  console.log('');

  // Get all lessons
  const lessons = await getAllLessons();
  console.log(`Found ${lessons.length} total lessons\n`);

  // Categorize
  const withVideo = lessons.filter(l => l.videoKey);
  const withHls = lessons.filter(l => l.hlsManifestKey);
  const missing = lessons.filter(l => l.videoKey && !l.hlsManifestKey);

  console.log('Summary:');
  console.log(`  Lessons with video (videoKey): ${withVideo.length}`);
  console.log(`  Lessons with HLS (hlsManifestKey): ${withHls.length}`);
  console.log(`  Missing HLS encoding: ${missing.length}`);
  console.log('');

  // Check lessons with HLS
  if (withHls.length > 0) {
    console.log('Verifying HLS manifests in S3...\n');

    let verifiedCount = 0;
    let missingInS3 = 0;

    for (const lesson of withHls) {
      const manifestKey = lesson.hlsManifestKey!;
      const exists = await fileExists(manifestKey);

      if (exists) {
        // Also list the HLS files to show what was generated
        const prefix = manifestKey.replace(/\/[^/]+\.m3u8$/, '/');
        const files = await listFiles(prefix);
        const videoFiles = files.filter(f => f.endsWith('.m3u8') || f.endsWith('.ts'));

        console.log(`  ✓ ${lesson.lessonId}`);
        console.log(`    Manifest: ${manifestKey}`);
        console.log(`    Files: ${videoFiles.length} (${files.length} total)`);
        verifiedCount++;
      } else {
        console.log(`  ✗ ${lesson.lessonId}`);
        console.log(`    Manifest NOT FOUND: ${manifestKey}`);
        missingInS3++;
      }
    }

    console.log('');
    console.log(`Verified in S3: ${verifiedCount}/${withHls.length}`);
    if (missingInS3 > 0) {
      console.log(`WARNING: ${missingInS3} manifest(s) missing from S3`);
    }
  }

  // Report missing HLS
  if (missing.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('Lessons still needing HLS encoding:');
    console.log('-'.repeat(60));
    for (const lesson of missing) {
      console.log(`  - ${lesson.lessonId} (${lesson.courseId})`);
      console.log(`    videoKey: ${lesson.videoKey}`);
    }
    console.log('');
    console.log('Run: npx ts-node --esm scripts/batch-encode-videos.ts');
  }

  // Final status
  console.log('\n' + '='.repeat(60));
  if (missing.length === 0 && withHls.length === withVideo.length) {
    console.log('✅ All lessons have HLS encoding!');
  } else {
    console.log(`⚠️  ${missing.length} lesson(s) still need HLS encoding`);
  }
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
