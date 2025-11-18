import { DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createIntegrationTestClient } from './dynamodb-client.js';
import { createTestCourse, createTestLessons, createTestEnrollment } from '../fixtures/test-data.js';
import type { Course } from '../../features/courses/course.types.js';
import type { Lesson } from '../../features/lessons/lesson.types.js';
import type { Enrollment } from '../../features/enrollment/enrollment.types.js';

/**
 * Generate unique ID for test data
 * Format: timestamp-random
 * Example: 1736943600000-k2j4h5m3p
 */
export function generateTestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get table name from environment
 */
function getTableName(): string {
  const tableName = process.env.EDUCATION_TABLE_NAME;
  if (!tableName) {
    throw new Error('EDUCATION_TABLE_NAME environment variable is not set');
  }
  return tableName;
}

interface CleanupResult {
  success: boolean;
  failedItems: Array<{ item: { PK: string; SK: string }; error: unknown }>;
}

/**
 * Test Data Manager
 * Manages test data lifecycle: creation, tracking, and cleanup
 */
export class TestDataManager {
  private docClient = createIntegrationTestClient();
  private createdItems: Array<{ PK: string; SK: string }> = [];

  /**
   * Insert a course into DynamoDB and track for cleanup
   */
  async insertCourse(courseId: string): Promise<Course> {
    const course = createTestCourse(courseId);

    const item = {
      PK: `COURSE#${courseId}`,
      SK: 'METADATA',
      entityType: 'COURSE',
      ...course,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: getTableName(),
        Item: item,
      })
    );

    // Track for cleanup
    this.createdItems.push({ PK: item.PK, SK: item.SK });

    console.log(`  ✓ Inserted course: ${courseId}`);
    return course;
  }

  /**
   * Insert lessons for a course and track for cleanup
   */
  async insertLessons(courseId: string, count: number = 5): Promise<string[]> {
    const lessons = createTestLessons(courseId, count);
    const lessonIds: string[] = [];

    for (const lesson of lessons) {
      const item = {
        PK: `COURSE#${courseId}`,
        SK: `LESSON#${lesson.lessonId}`,
        GSI1PK: `LESSON#${lesson.lessonId}`,
        GSI1SK: `COURSE#${courseId}`,
        entityType: 'LESSON',
        ...lesson,
      };

      await this.docClient.send(
        new PutCommand({
          TableName: getTableName(),
          Item: item,
        })
      );

      // Track for cleanup
      this.createdItems.push({ PK: item.PK, SK: item.SK });
      lessonIds.push(lesson.lessonId);
    }

    console.log(`  ✓ Inserted ${count} lessons for course: ${courseId}`);
    return lessonIds;
  }

  /**
   * Insert an enrollment and track for cleanup
   */
  async insertEnrollment(userId: string, courseId: string): Promise<Enrollment> {
    const enrollment = createTestEnrollment(userId, courseId);

    const item = {
      PK: `USER#${userId}`,
      SK: `COURSE#${courseId}`,
      GSI1PK: `COURSE#${courseId}`,
      GSI1SK: `USER#${userId}`,
      entityType: 'ENROLLMENT',
      ...enrollment,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: getTableName(),
        Item: item,
      })
    );

    // Track for cleanup
    this.createdItems.push({ PK: item.PK, SK: item.SK });

    console.log(`  ✓ Inserted enrollment: ${userId} -> ${courseId}`);
    return enrollment;
  }

  /**
   * Delete a progress record (used in afterEach for fresh state)
   */
  async deleteProgress(userId: string, courseId: string): Promise<void> {
    try {
      await this.docClient.send(
        new DeleteCommand({
          TableName: getTableName(),
          Key: {
            PK: `STUDENT#${userId}`,
            SK: `PROGRESS#${courseId}`,
          },
        })
      );
      console.log(`  ✓ Deleted progress: ${userId} -> ${courseId}`);
    } catch (error) {
      // Ignore error if progress doesn't exist
      if ((error as { name?: string })?.name !== 'ResourceNotFoundException') {
        console.warn(`  ⚠ Failed to delete progress: ${userId} -> ${courseId}`, error);
      }
    }
  }

  /**
   * Clean up all tracked test data
   * CRITICAL: Must be called in afterAll to prevent data pollution
   */
  async cleanup(): Promise<CleanupResult> {
    const failedItems: CleanupResult['failedItems'] = [];
    let successCount = 0;

    console.log(`\n🧹 Cleaning up ${this.createdItems.length} test items...`);

    for (const item of this.createdItems) {
      try {
        await this.docClient.send(
          new DeleteCommand({
            TableName: getTableName(),
            Key: {
              PK: item.PK,
              SK: item.SK,
            },
          })
        );
        successCount++;
      } catch (error) {
        failedItems.push({ item, error });
        console.error(`  ❌ Failed to delete: ${item.PK} / ${item.SK}`, error);
      }
    }

    if (failedItems.length > 0) {
      console.error(`\n❌ CLEANUP FAILED: ${failedItems.length} items could not be deleted`);
      console.error('Failed items:', failedItems.map(f => f.item));
      return { success: false, failedItems };
    }

    console.log(`✓ Successfully cleaned up ${successCount} test items\n`);
    return { success: true, failedItems: [] };
  }

  /**
   * Get the number of tracked items (for verification)
   */
  getTrackedItemCount(): number {
    return this.createdItems.length;
  }
}
