import { describe, it, beforeAll, afterEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { TestDataManager, generateTestId } from '../../../__integration__/helpers/test-data-manager.js';
import { createAuthHeader } from '../../../__integration__/fixtures/test-data.js';
import progressRoutes from '../progress.routes.js';

describe('Progress Integration Tests', () => {
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

    console.log('\n📝 Setting up progress integration tests...');
    console.log(`  Test User ID: ${testUserId}`);
    console.log(`  Test Course ID: ${testCourseId}`);

    // Insert test data into real DynamoDB preview table
    await testDataManager.insertCourse(testCourseId);
    testLessonIds = await testDataManager.insertLessons(testCourseId, 5);

    console.log(`  ✓ Test data inserted (${testDataManager.getTrackedItemCount()} items tracked)\n`);

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/progress', progressRoutes);
  });

  afterEach(async () => {
    // Clean up progress data after each test to ensure fresh state
    await testDataManager.deleteProgress(testUserId, testCourseId);
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

  describe('GET /api/progress/:courseId', () => {
    it('should return default empty progress from real DynamoDB (no record)', async () => {
      const response = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('courseId', testCourseId);
      expect(response.body).toHaveProperty('completedLessons', []);
      expect(response.body).toHaveProperty('percentage', 0);
      expect(response.body).toHaveProperty('totalLessons', 5);
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).not.toHaveProperty('lastAccessedLesson');
    });

    it('should return existing progress with correct percentage', async () => {
      // First, create some progress
      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[1] });

      // Now fetch progress
      const response = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body.courseId).toBe(testCourseId);
      expect(response.body.completedLessons).toHaveLength(2);
      expect(response.body.completedLessons).toContain(testLessonIds[0]);
      expect(response.body.completedLessons).toContain(testLessonIds[1]);
      expect(response.body.percentage).toBe(40); // 2 of 5 = 40%
      expect(response.body.totalLessons).toBe(5);
      expect(response.body.lastAccessedLesson).toBe(testLessonIds[1]);
    });

    it('should include correct totalLessons from lesson count query', async () => {
      const response = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body.totalLessons).toBe(5);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get(`/api/progress/${testCourseId}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('POST /api/progress', () => {
    it('should create new progress record in DynamoDB (first lesson)', async () => {
      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({
          courseId: testCourseId,
          lessonId: testLessonIds[0],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('courseId', testCourseId);
      expect(response.body).toHaveProperty('completedLessons', [testLessonIds[0]]);
      expect(response.body).toHaveProperty('lastAccessedLesson', testLessonIds[0]);
      expect(response.body).toHaveProperty('percentage', 20); // 1 of 5 = 20%
      expect(response.body).toHaveProperty('totalLessons', 5);
      expect(response.body).toHaveProperty('updatedAt');

      // Verify it was actually saved to DynamoDB
      const fetchResponse = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(fetchResponse.body.completedLessons).toEqual([testLessonIds[0]]);
      expect(fetchResponse.body.percentage).toBe(20);
    });

    it('should update existing progress in DynamoDB (UpdateCommand)', async () => {
      // Create initial progress
      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      // Update with second lesson
      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[1] });

      expect(response.status).toBe(200);
      expect(response.body.completedLessons).toHaveLength(2);
      expect(response.body.completedLessons).toContain(testLessonIds[0]);
      expect(response.body.completedLessons).toContain(testLessonIds[1]);
      expect(response.body.percentage).toBe(40); // 2 of 5 = 40%
    });

    it('should verify deduplication works in real DynamoDB', async () => {
      // Mark lesson-1 complete
      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      // Mark lesson-1 complete AGAIN (should deduplicate)
      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      expect(response.status).toBe(200);
      expect(response.body.completedLessons).toHaveLength(1); // Still only 1 lesson
      expect(response.body.completedLessons).toEqual([testLessonIds[0]]);
      expect(response.body.percentage).toBe(20); // Still 20%
    });

    it('should validate UpdateExpression syntax against real DynamoDB', async () => {
      // This test ensures the UpdateExpression in progress.repository works
      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[2] });

      expect(response.status).toBe(200);
      expect(response.body.completedLessons).toContain(testLessonIds[2]);
    });

    it('should handle 100% completion correctly', async () => {
      // Mark all 5 lessons complete
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/progress')
          .set(createAuthHeader(testUserId))
          .send({ courseId: testCourseId, lessonId: testLessonIds[i] });
      }

      // Fetch final progress
      const response = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(response.status).toBe(200);
      expect(response.body.completedLessons).toHaveLength(5);
      expect(response.body.percentage).toBe(100);
      expect(response.body.lastAccessedLesson).toBe(testLessonIds[4]);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/progress')
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 for invalid request body (missing courseId)', async () => {
      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ lessonId: testLessonIds[0] });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
    });

    it('should return 400 for invalid request body (missing lessonId)', async () => {
      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
    });
  });

  describe('Progress Calculation with Real Data', () => {
    it('should mark 1 of 5 lessons → verify 20% in DynamoDB', async () => {
      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      const response = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(response.body.percentage).toBe(20);
      expect(response.body.completedLessons).toHaveLength(1);
    });

    it('should mark 3 of 5 lessons → verify 60% in DynamoDB', async () => {
      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[1] });

      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[2] });

      const response = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(response.body.percentage).toBe(60);
      expect(response.body.completedLessons).toHaveLength(3);
    });

    it('should mark all 5 lessons → verify 100% in DynamoDB', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/progress')
          .set(createAuthHeader(testUserId))
          .send({ courseId: testCourseId, lessonId: testLessonIds[i] });
      }

      const response = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(response.body.percentage).toBe(100);
      expect(response.body.completedLessons).toHaveLength(5);
    });

    it('should test Math.round() with 2 of 3 lessons = 67%', async () => {
      // Create a course with 3 lessons for this specific test
      const uniqueId = generateTestId();
      const courseWith3Lessons = `integration-test-3lesson-course-${uniqueId}`;
      const userFor3Lessons = `integration-test-3lesson-user-${uniqueId}`;

      await testDataManager.insertCourse(courseWith3Lessons);
      const threeLessonIds = await testDataManager.insertLessons(courseWith3Lessons, 3);

      // Mark 2 of 3 complete
      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userFor3Lessons))
        .send({ courseId: courseWith3Lessons, lessonId: threeLessonIds[0] });

      const response = await request(app)
        .post('/api/progress')
        .set(createAuthHeader(userFor3Lessons))
        .send({ courseId: courseWith3Lessons, lessonId: threeLessonIds[1] });

      expect(response.body.percentage).toBe(67); // Math.round(66.666...) = 67
      expect(response.body.completedLessons).toHaveLength(2);
      expect(response.body.totalLessons).toBe(3);

      // Cleanup
      await testDataManager.deleteProgress(userFor3Lessons, courseWith3Lessons);
    });
  });

  describe('POST /api/progress/access', () => {
    it('should track lesson access in DynamoDB (lightweight update)', async () => {
      const response = await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(testUserId))
        .send({
          courseId: testCourseId,
          lessonId: testLessonIds[2],
        });

      expect(response.status).toBe(204);

      // Verify lastAccessedLesson was saved to DynamoDB
      const fetchResponse = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(fetchResponse.body.lastAccessedLesson).toBe(testLessonIds[2]);
    });

    it('should only update lastAccessedLesson without affecting completedLessons', async () => {
      // First complete a lesson
      await request(app)
        .post('/api/progress')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      // Then track access to a different lesson (without completing it)
      await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[3] });

      // Verify completedLessons is unchanged but lastAccessedLesson is updated
      const fetchResponse = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(fetchResponse.body.completedLessons).toEqual([testLessonIds[0]]);
      expect(fetchResponse.body.completedLessons).toHaveLength(1);
      expect(fetchResponse.body.lastAccessedLesson).toBe(testLessonIds[3]);
      expect(fetchResponse.body.percentage).toBe(20); // Still 20%, not affected
    });

    it('should create progress record if none exists (upsert behavior)', async () => {
      // Track access without any prior progress
      await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[1] });

      // Verify progress record was created with lastAccessedLesson
      const fetchResponse = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(fetchResponse.body.lastAccessedLesson).toBe(testLessonIds[1]);
    });

    it('should allow updating lastAccessedLesson multiple times', async () => {
      // Track access to lesson 1
      await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      // Track access to lesson 3
      await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[2] });

      // Track access to lesson 5
      await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId, lessonId: testLessonIds[4] });

      // Verify only the last access is recorded
      const fetchResponse = await request(app)
        .get(`/api/progress/${testCourseId}`)
        .set(createAuthHeader(testUserId));

      expect(fetchResponse.body.lastAccessedLesson).toBe(testLessonIds[4]);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/progress/access')
        .send({ courseId: testCourseId, lessonId: testLessonIds[0] });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/progress/access')
        .set(createAuthHeader(testUserId))
        .send({ courseId: testCourseId }); // Missing lessonId

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing or invalid courseId or lessonId' });
    });
  });
});
