import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { TestDataManager, generateTestId } from '../../../__integration__/helpers/test-data-manager.js';
import { createAuthHeader } from '../../../__integration__/fixtures/test-data.js';
import courseRoutes from '../../courses/course.routes.js';
import lessonRoutes from '../lesson.routes.js';

describe('Lesson Integration Tests', () => {
  const testDataManager = new TestDataManager();
  let app: express.Application;
  let testCourseId: string;
  let testUserId: string;
  let testLessonIds: string[];

  beforeAll(async () => {
    // Generate unique IDs for this test run
    const uniqueId = generateTestId();
    testUserId = `integration-test-user-${uniqueId}`;
    testCourseId = `integration-test-course-${uniqueId}`;

    console.log('\n📝 Setting up lesson integration tests...');
    console.log(`  Test User ID: ${testUserId}`);
    console.log(`  Test Course ID: ${testCourseId}`);

    // Insert test data into real DynamoDB preview table
    await testDataManager.insertCourse(testCourseId);
    testLessonIds = await testDataManager.insertLessons(testCourseId, 5);
    await testDataManager.insertEnrollment(testUserId, testCourseId);

    console.log(`  ✓ Test data inserted (${testDataManager.getTrackedItemCount()} items tracked)\n`);

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/courses', courseRoutes);
    app.use('/api/lessons', lessonRoutes);
  });

  afterAll(async () => {
    // CRITICAL: Clean up all test data from preview DynamoDB
    const result = await testDataManager.cleanup();
    if (!result.success) {
      throw new Error(
        `❌ Integration test cleanup failed! ${result.failedItems.length} items could not be deleted.`
      );
    }
  });

  describe('GET /api/courses/:courseId/lessons', () => {
    it('should return lessons ordered by order field from real DynamoDB', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourseId}/lessons`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('lessons');
      expect(response.body).toHaveProperty('totalLessons');
      expect(response.body.lessons).toHaveLength(5);
      expect(response.body.totalLessons).toBe(5);

      // Verify lessons are ordered correctly
      const lessons = response.body.lessons;
      expect(lessons[0].order).toBe(1);
      expect(lessons[1].order).toBe(2);
      expect(lessons[2].order).toBe(3);
      expect(lessons[3].order).toBe(4);
      expect(lessons[4].order).toBe(5);

      // Verify each lesson has correct structure
      lessons.forEach((lesson: any, index: number) => {
        expect(lesson).toHaveProperty('lessonId');
        expect(lesson).toHaveProperty('courseId', testCourseId);
        expect(lesson).toHaveProperty('title');
        expect(lesson).toHaveProperty('order', index + 1);
        expect(lesson).toHaveProperty('lengthInMins');

        // SECURITY: Verify videoKey is NOT exposed
        expect(lesson).not.toHaveProperty('videoKey');
      });
    });

    it('should exclude videoKey from response (security check)', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourseId}/lessons`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);

      // Verify no lesson contains videoKey
      const lessons = response.body.lessons;
      lessons.forEach((lesson: any) => {
        expect(lesson).not.toHaveProperty('videoKey');
      });
    });

    it('should return empty array for course with no lessons', async () => {
      const uniqueId = generateTestId();
      const emptyCourseId = `integration-test-empty-course-${uniqueId}`;

      // Create course with no lessons
      await testDataManager.insertCourse(emptyCourseId);

      const response = await request(app)
        .get(`/api/courses/${emptyCourseId}/lessons`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body.lessons).toEqual([]);
      expect(response.body.totalLessons).toBe(0);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get(`/api/courses/${testCourseId}/lessons`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should verify actual DynamoDB Query operation works', async () => {
      // This test validates that:
      // 1. DynamoDB Query with PK/SK pattern works
      // 2. GSI is not needed for this query (uses main table)
      // 3. Results are sorted correctly in-memory
      const response = await request(app)
        .get(`/api/courses/${testCourseId}/lessons`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body.lessons).toHaveLength(5);

      // Verify order is maintained (important for DynamoDB queries)
      const orders = response.body.lessons.map((l: any) => l.order);
      expect(orders).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('GET /api/lessons/:lessonId/video-url', () => {
    it('should fetch real lesson from DynamoDB and generate signed URL', async () => {
      const lessonId = testLessonIds[0]; // First lesson

      const response = await request(app)
        .get(`/api/lessons/${lessonId}/video-url`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('videoUrl');
      expect(response.body).toHaveProperty('expiresAt');

      // Verify it's a CloudFront URL
      expect(response.body.videoUrl).toContain('cloudfront.net');
      expect(response.body.videoUrl).toContain('integration-tests/videos/');

      // Verify CloudFront signature parameters
      expect(response.body.videoUrl).toContain('Expires=');
      expect(response.body.videoUrl).toContain('Signature=');
      expect(response.body.videoUrl).toContain('Key-Pair-Id=');

      // Verify expiresAt is a valid timestamp in the future
      expect(typeof response.body.expiresAt).toBe('number');
      expect(response.body.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should return 401 if not authenticated', async () => {
      const lessonId = testLessonIds[0];

      const response = await request(app).get(`/api/lessons/${lessonId}/video-url`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 403 if enrollment does not exist in DynamoDB', async () => {
      const unenrolledUserId = `integration-test-unenrolled-${generateTestId()}`;
      const lessonId = testLessonIds[0];

      const response = await request(app)
        .get(`/api/lessons/${lessonId}/video-url`)
        .set(createAuthHeader(unenrolledUserId));

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Not enrolled in this course' });
    });

    it('should return 404 if lesson does not exist in DynamoDB', async () => {
      const nonexistentLessonId = `integration-test-nonexistent-${generateTestId()}`;

      const response = await request(app)
        .get(`/api/lessons/${nonexistentLessonId}/video-url`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Lesson not found' });
    });

    it('should verify GSI1 query works for lesson lookup', async () => {
      // This test validates that the GSI1 index works correctly
      // Query pattern: GSI1PK = "LESSON#<lessonId>"
      const lessonId = testLessonIds[2]; // Third lesson

      const response = await request(app)
        .get(`/api/lessons/${lessonId}/video-url`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body.videoUrl).toBeDefined();
    });

    it('should verify enrollment check queries DynamoDB', async () => {
      // This validates the enrollment check actually queries DynamoDB
      // If enrollment doesn't exist, should get 403
      const uniqueId = generateTestId();
      const otherCourseId = `integration-test-other-course-${uniqueId}`;
      const otherUserId = `integration-test-other-user-${uniqueId}`;

      // Create a course with lessons but NO enrollment
      await testDataManager.insertCourse(otherCourseId);
      const otherLessonIds = await testDataManager.insertLessons(otherCourseId, 1);

      const response = await request(app)
        .get(`/api/lessons/${otherLessonIds[0]}/video-url`)
        .set(createAuthHeader(otherUserId));

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Not enrolled in this course' });
    });
  });
});
