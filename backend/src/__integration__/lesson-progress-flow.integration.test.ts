import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { TestDataManager, generateTestId } from './helpers/test-data-manager.js';
import { createAuthHeader } from './fixtures/test-data.js';
import courseRoutes from '../features/courses/course.routes.js';
import lessonRoutes from '../features/lessons/lesson.routes.js';
import progressRoutes from '../features/progress/progress.routes.js';

/**
 * E2E Flow Integration Test
 *
 * Validates the complete user journey through the course system:
 * 1. Enroll in a course
 * 2. Fetch course lessons
 * 3. Check initial progress (0%)
 * 4. Watch video (get signed URL)
 * 5. Mark lesson as complete
 * 6. Verify progress updates
 * 7. Continue until course completion (100%)
 *
 * This test exercises the entire API surface and validates real DynamoDB operations.
 */
describe('E2E: Complete Course Learning Flow', () => {
  const testDataManager = new TestDataManager();
  let app: express.Application;
  let testCourseId: string;
  let testUserId: string;
  let testLessonIds: string[];

  beforeAll(async () => {
    // Generate unique IDs for this test run
    const uniqueId = generateTestId();
    testUserId = `integration-test-e2e-user-${uniqueId}`;
    testCourseId = `integration-test-e2e-course-${uniqueId}`;

    console.log('\n🎬 Setting up E2E flow integration test...');
    console.log(`  Test User ID: ${testUserId}`);
    console.log(`  Test Course ID: ${testCourseId}`);

    // Insert test data into real DynamoDB preview table
    await testDataManager.insertCourse(testCourseId);
    testLessonIds = await testDataManager.insertLessons(testCourseId, 3); // 3 lessons for faster test
    await testDataManager.insertEnrollment(testUserId, testCourseId);

    console.log(`  ✓ Test data inserted (${testDataManager.getTrackedItemCount()} items tracked)\n`);

    // Setup Express app with all routes
    app = express();
    app.use(express.json());
    app.use('/api/courses', courseRoutes);
    app.use('/api/lessons', lessonRoutes);
    app.use('/api/progress', progressRoutes);
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

  it('should complete full course journey: lessons → progress → video → completion', async () => {
    // ========================================
    // Step 1: Fetch course lessons
    // ========================================
    console.log('\n  📚 Step 1: Fetching course lessons...');
    const lessonsResponse = await request(app)
      .get(`/api/courses/${testCourseId}/lessons`)
      .set(createAuthHeader(testUserId));

    expect(lessonsResponse.status).toBe(200);
    expect(lessonsResponse.body.lessons).toHaveLength(3);
    expect(lessonsResponse.body.totalLessons).toBe(3);
    expect(lessonsResponse.body.lessons[0].order).toBe(1);
    expect(lessonsResponse.body.lessons[1].order).toBe(2);
    expect(lessonsResponse.body.lessons[2].order).toBe(3);

    // Verify videoKey is NOT exposed (security)
    lessonsResponse.body.lessons.forEach((lesson: any) => {
      expect(lesson).not.toHaveProperty('videoKey');
    });

    console.log('    ✓ Fetched 3 lessons in correct order');

    // ========================================
    // Step 2: Check initial progress (0%)
    // ========================================
    console.log('  📊 Step 2: Checking initial progress...');
    const initialProgressResponse = await request(app)
      .get(`/api/progress/${testCourseId}`)
      .set(createAuthHeader(testUserId));

    expect(initialProgressResponse.status).toBe(200);
    expect(initialProgressResponse.body.courseId).toBe(testCourseId);
    expect(initialProgressResponse.body.completedLessons).toEqual([]);
    expect(initialProgressResponse.body.percentage).toBe(0);
    expect(initialProgressResponse.body.totalLessons).toBe(3);
    expect(initialProgressResponse.body).not.toHaveProperty('lastAccessedLesson');

    console.log('    ✓ Initial progress: 0% (0/3 lessons)');

    // ========================================
    // Step 3: Watch first lesson (get video URL)
    // ========================================
    console.log('  🎥 Step 3: Getting video URL for lesson 1...');
    const videoUrlResponse1 = await request(app)
      .get(`/api/lessons/${testLessonIds[0]}/video-url`)
      .set(createAuthHeader(testUserId));

    expect(videoUrlResponse1.status).toBe(200);
    expect(videoUrlResponse1.body).toHaveProperty('videoUrl');
    expect(videoUrlResponse1.body).toHaveProperty('expiresAt');
    expect(videoUrlResponse1.body.videoUrl).toContain('cloudfront.net');
    expect(videoUrlResponse1.body.videoUrl).toContain('Signature=');
    expect(videoUrlResponse1.body.videoUrl).toContain('Key-Pair-Id=');

    console.log('    ✓ Video URL generated with CloudFront signature');

    // ========================================
    // Step 4: Mark first lesson as complete
    // ========================================
    console.log('  ✅ Step 4: Marking lesson 1 as complete...');
    const markComplete1 = await request(app)
      .post('/api/progress')
      .set(createAuthHeader(testUserId))
      .send({
        courseId: testCourseId,
        lessonId: testLessonIds[0],
      });

    expect(markComplete1.status).toBe(200);
    expect(markComplete1.body.completedLessons).toEqual([testLessonIds[0]]);
    expect(markComplete1.body.lastAccessedLesson).toBe(testLessonIds[0]);
    expect(markComplete1.body.percentage).toBe(33); // 1/3 = 33.33... → 33
    expect(markComplete1.body.totalLessons).toBe(3);

    console.log('    ✓ Progress updated: 33% (1/3 lessons)');

    // ========================================
    // Step 5: Verify progress persisted in DynamoDB
    // ========================================
    console.log('  🔍 Step 5: Verifying progress persisted...');
    const verifyProgress1 = await request(app)
      .get(`/api/progress/${testCourseId}`)
      .set(createAuthHeader(testUserId));

    expect(verifyProgress1.status).toBe(200);
    expect(verifyProgress1.body.completedLessons).toEqual([testLessonIds[0]]);
    expect(verifyProgress1.body.percentage).toBe(33);
    expect(verifyProgress1.body.lastAccessedLesson).toBe(testLessonIds[0]);

    console.log('    ✓ Progress correctly saved to DynamoDB');

    // ========================================
    // Step 6: Complete second lesson
    // ========================================
    console.log('  🎥 Step 6: Watching and completing lesson 2...');

    // Get video URL for lesson 2
    const videoUrlResponse2 = await request(app)
      .get(`/api/lessons/${testLessonIds[1]}/video-url`)
      .set(createAuthHeader(testUserId));

    expect(videoUrlResponse2.status).toBe(200);
    expect(videoUrlResponse2.body.videoUrl).toContain('cloudfront.net');

    // Mark lesson 2 complete
    const markComplete2 = await request(app)
      .post('/api/progress')
      .set(createAuthHeader(testUserId))
      .send({
        courseId: testCourseId,
        lessonId: testLessonIds[1],
      });

    expect(markComplete2.status).toBe(200);
    expect(markComplete2.body.completedLessons).toHaveLength(2);
    expect(markComplete2.body.completedLessons).toContain(testLessonIds[0]);
    expect(markComplete2.body.completedLessons).toContain(testLessonIds[1]);
    expect(markComplete2.body.percentage).toBe(67); // 2/3 = 66.66... → 67
    expect(markComplete2.body.lastAccessedLesson).toBe(testLessonIds[1]);

    console.log('    ✓ Progress updated: 67% (2/3 lessons)');

    // ========================================
    // Step 7: Complete final lesson (100%)
    // ========================================
    console.log('  🎯 Step 7: Completing final lesson...');

    // Get video URL for lesson 3
    const videoUrlResponse3 = await request(app)
      .get(`/api/lessons/${testLessonIds[2]}/video-url`)
      .set(createAuthHeader(testUserId));

    expect(videoUrlResponse3.status).toBe(200);

    // Mark lesson 3 complete
    const markComplete3 = await request(app)
      .post('/api/progress')
      .set(createAuthHeader(testUserId))
      .send({
        courseId: testCourseId,
        lessonId: testLessonIds[2],
      });

    expect(markComplete3.status).toBe(200);
    expect(markComplete3.body.completedLessons).toHaveLength(3);
    expect(markComplete3.body.completedLessons).toContain(testLessonIds[0]);
    expect(markComplete3.body.completedLessons).toContain(testLessonIds[1]);
    expect(markComplete3.body.completedLessons).toContain(testLessonIds[2]);
    expect(markComplete3.body.percentage).toBe(100);
    expect(markComplete3.body.lastAccessedLesson).toBe(testLessonIds[2]);

    console.log('    ✓ Course completed: 100% (3/3 lessons)');

    // ========================================
    // Step 8: Final verification - course fully completed
    // ========================================
    console.log('  🏆 Step 8: Final verification...');
    const finalProgress = await request(app)
      .get(`/api/progress/${testCourseId}`)
      .set(createAuthHeader(testUserId));

    expect(finalProgress.status).toBe(200);
    expect(finalProgress.body.completedLessons).toHaveLength(3);
    expect(finalProgress.body.percentage).toBe(100);
    expect(finalProgress.body.totalLessons).toBe(3);
    expect(finalProgress.body.lastAccessedLesson).toBe(testLessonIds[2]);

    console.log('    ✓ Course completion verified in DynamoDB\n');
  });

  it('should prevent unenrolled user from accessing video URLs', async () => {
    console.log('\n  🔒 Testing access control...');

    // Create a new user who is NOT enrolled
    const unenrolledUserId = `integration-test-unenrolled-${generateTestId()}`;

    // Attempt to get video URL
    const response = await request(app)
      .get(`/api/lessons/${testLessonIds[0]}/video-url`)
      .set(createAuthHeader(unenrolledUserId));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Not enrolled in this course' });

    console.log('    ✓ Unenrolled user correctly denied access\n');
  });

  it('should handle idempotent lesson completion (marking same lesson twice)', async () => {
    console.log('\n  🔁 Testing idempotent completion...');

    // Create a fresh user for this test
    const uniqueId = generateTestId();
    const idempotentUserId = `integration-test-idempotent-${uniqueId}`;
    await testDataManager.insertEnrollment(idempotentUserId, testCourseId);

    // Mark lesson 1 complete
    const firstMark = await request(app)
      .post('/api/progress')
      .set(createAuthHeader(idempotentUserId))
      .send({
        courseId: testCourseId,
        lessonId: testLessonIds[0],
      });

    expect(firstMark.status).toBe(200);
    expect(firstMark.body.completedLessons).toEqual([testLessonIds[0]]);
    expect(firstMark.body.percentage).toBe(33);

    // Mark lesson 1 complete AGAIN
    const secondMark = await request(app)
      .post('/api/progress')
      .set(createAuthHeader(idempotentUserId))
      .send({
        courseId: testCourseId,
        lessonId: testLessonIds[0],
      });

    expect(secondMark.status).toBe(200);
    expect(secondMark.body.completedLessons).toEqual([testLessonIds[0]]); // Still only 1
    expect(secondMark.body.percentage).toBe(33); // Still 33%

    // Verify in DynamoDB
    const progress = await request(app)
      .get(`/api/progress/${testCourseId}`)
      .set(createAuthHeader(idempotentUserId));

    expect(progress.body.completedLessons).toHaveLength(1);
    expect(progress.body.completedLessons).toEqual([testLessonIds[0]]);

    console.log('    ✓ Idempotent completion works correctly\n');

    // Cleanup
    await testDataManager.deleteProgress(idempotentUserId, testCourseId);
  });

  it('should handle out-of-order lesson completion', async () => {
    console.log('\n  🔀 Testing out-of-order completion...');

    // Create a fresh user for this test
    const uniqueId = generateTestId();
    const oooUserId = `integration-test-ooo-${uniqueId}`;
    await testDataManager.insertEnrollment(oooUserId, testCourseId);

    // Complete lessons in order: 3, 1, 2 (out of order)
    console.log('    Completing lesson 3 (last)...');
    const mark3 = await request(app)
      .post('/api/progress')
      .set(createAuthHeader(oooUserId))
      .send({
        courseId: testCourseId,
        lessonId: testLessonIds[2], // Lesson 3
      });

    expect(mark3.status).toBe(200);
    expect(mark3.body.percentage).toBe(33);

    console.log('    Completing lesson 1 (first)...');
    const mark1 = await request(app)
      .post('/api/progress')
      .set(createAuthHeader(oooUserId))
      .send({
        courseId: testCourseId,
        lessonId: testLessonIds[0], // Lesson 1
      });

    expect(mark1.status).toBe(200);
    expect(mark1.body.completedLessons).toHaveLength(2);
    expect(mark1.body.percentage).toBe(67);

    console.log('    Completing lesson 2 (middle)...');
    const mark2 = await request(app)
      .post('/api/progress')
      .set(createAuthHeader(oooUserId))
      .send({
        courseId: testCourseId,
        lessonId: testLessonIds[1], // Lesson 2
      });

    expect(mark2.status).toBe(200);
    expect(mark2.body.completedLessons).toHaveLength(3);
    expect(mark2.body.percentage).toBe(100);

    // Verify all lessons are marked complete
    const finalProgress = await request(app)
      .get(`/api/progress/${testCourseId}`)
      .set(createAuthHeader(oooUserId));

    expect(finalProgress.body.completedLessons).toHaveLength(3);
    expect(finalProgress.body.completedLessons).toContain(testLessonIds[0]);
    expect(finalProgress.body.completedLessons).toContain(testLessonIds[1]);
    expect(finalProgress.body.completedLessons).toContain(testLessonIds[2]);

    console.log('    ✓ Out-of-order completion handled correctly\n');

    // Cleanup
    await testDataManager.deleteProgress(oooUserId, testCourseId);
  });
});
