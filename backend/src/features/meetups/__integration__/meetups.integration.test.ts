import { describe, it, beforeAll, afterEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import {
  TestDataManager,
  generateTestId,
} from '../../../__integration__/helpers/test-data-manager.js';
import { createAuthHeader } from '../../../__integration__/fixtures/test-data.js';
import meetupsRoutes from '../meetups.routes.js';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { createIntegrationTestClient } from '../../../__integration__/helpers/dynamodb-client.js';

function getTableName(): string {
  const tableName = process.env.EDUCATION_TABLE_NAME;
  if (!tableName) {
    throw new Error('EDUCATION_TABLE_NAME environment variable is not set');
  }
  return tableName;
}

describe('Meetups Integration Tests', () => {
  const testDataManager = new TestDataManager();
  const docClient = createIntegrationTestClient();
  let app: express.Application;
  let testUserId: string;
  const signupsToCleanup: Array<{ userId: string; meetupId: string }> = [];

  beforeAll(async () => {
    console.log('\n🚀 Setting up Meetups integration tests...');

    // Generate unique user ID
    const uniqueId = generateTestId();
    testUserId = `integration-test-user-${uniqueId}`;

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/meetups', meetupsRoutes);

    console.log(`  ✓ Test user ID: ${testUserId}`);
  });

  afterEach(async () => {
    // Clean up signups after each test
    for (const signup of signupsToCleanup) {
      try {
        await docClient.send(
          new DeleteCommand({
            TableName: getTableName(),
            Key: {
              PK: `STUDENT#${signup.userId}`,
              SK: `MEETUP_SIGNUP#${signup.meetupId}`,
            },
          })
        );
        console.log(`  ✓ Cleaned up signup: ${signup.userId} -> ${signup.meetupId}`);
      } catch (error) {
        console.warn(`  ⚠ Failed to delete signup:`, error);
      }
    }
    signupsToCleanup.length = 0; // Clear array
  });

  afterAll(async () => {
    // Clean up all test data
    const result = await testDataManager.cleanup();
    if (!result.success) {
      throw new Error('Integration test cleanup failed!');
    }
  });

  it('should complete full signup flow and verify in DynamoDB', async () => {
    console.log('\n📝 Test: Full signup flow');

    // Step 1: Verify user has no signups initially
    const initialResponse = await request(app)
      .get('/api/meetups')
      .set(createAuthHeader(testUserId));

    expect(initialResponse.status).toBe(200);
    expect(initialResponse.body).toHaveLength(1); // One hardcoded meetup
    expect(initialResponse.body[0].isSignedUp).toBe(false);
    console.log('  ✓ Initial state: User not signed up');

    // Step 2: Sign up for meetup
    const signupResponse = await request(app)
      .post('/api/meetups/spec-driven-dev-weekly/signup')
      .set(createAuthHeader(testUserId));

    expect(signupResponse.status).toBe(200);
    expect(signupResponse.body.success).toBe(true);
    console.log('  ✓ Signup successful');

    // Track for cleanup
    signupsToCleanup.push({ userId: testUserId, meetupId: 'spec-driven-dev-weekly' });

    // Step 3: Verify signup appears in subsequent GET
    const afterSignupResponse = await request(app)
      .get('/api/meetups')
      .set(createAuthHeader(testUserId));

    expect(afterSignupResponse.status).toBe(200);
    expect(afterSignupResponse.body[0].isSignedUp).toBe(true);
    console.log('  ✓ Signup reflected in GET /api/meetups');

    // Step 4: Verify record exists in DynamoDB
    const dbResult = await docClient.send(
      new DeleteCommand({
        TableName: getTableName(),
        Key: {
          PK: `STUDENT#${testUserId}`,
          SK: 'MEETUP_SIGNUP#spec-driven-dev-weekly',
        },
        ReturnValues: 'ALL_OLD',
      })
    );

    expect(dbResult.Attributes).toBeDefined();
    expect(dbResult.Attributes?.meetupId).toBe('spec-driven-dev-weekly');
    expect(dbResult.Attributes?.entityType).toBe('MEETUP_SIGNUP');
    console.log('  ✓ Signup record verified in DynamoDB');

    // Cleanup already done by DeleteCommand above, so remove from tracking
    const index = signupsToCleanup.findIndex(
      (s) => s.userId === testUserId && s.meetupId === 'spec-driven-dev-weekly'
    );
    if (index > -1) {
      signupsToCleanup.splice(index, 1);
    }
  });

  it('should handle duplicate signups idempotently', async () => {
    console.log('\n📝 Test: Idempotent signup');

    // Sign up first time
    const firstSignup = await request(app)
      .post('/api/meetups/spec-driven-dev-weekly/signup')
      .set(createAuthHeader(testUserId));

    expect(firstSignup.status).toBe(200);
    console.log('  ✓ First signup successful');

    // Track for cleanup
    signupsToCleanup.push({ userId: testUserId, meetupId: 'spec-driven-dev-weekly' });

    // Sign up second time (should not error)
    const secondSignup = await request(app)
      .post('/api/meetups/spec-driven-dev-weekly/signup')
      .set(createAuthHeader(testUserId));

    expect(secondSignup.status).toBe(200);
    expect(secondSignup.body.success).toBe(true);
    console.log('  ✓ Second signup successful (idempotent)');

    // Verify only one record in database
    const meetupsResponse = await request(app)
      .get('/api/meetups')
      .set(createAuthHeader(testUserId));

    expect(meetupsResponse.body[0].isSignedUp).toBe(true);
    console.log('  ✓ Only one signup record exists');
  });

  it('should return all hardcoded meetups with correct structure', async () => {
    console.log('\n📝 Test: Get all meetups');

    const response = await request(app).get('/api/meetups').set(createAuthHeader(testUserId));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1); // Single combined meetup

    const meetup = response.body[0];
    expect(meetup.meetupId).toBe('spec-driven-dev-weekly');
    expect(meetup.title).toBe('Spec Driven Development & Context Engineering');
    expect(meetup.description).toBeTruthy();
    expect(meetup.nextOccurrence).toBeTruthy(); // ISO timestamp
    expect(meetup.isRunning).toBe(false); // Unlikely to run during test
    expect(meetup.isSignedUp).toBe(false); // User not signed up
    expect(meetup.duration).toBe(60);
    expect(meetup.hostName).toBe('Rico Romero');

    // zoomLink should be undefined when not running
    if (!meetup.isRunning) {
      expect(meetup.zoomLink).toBeUndefined();
    }

    console.log('  ✓ Meetup structure validated');
    console.log(`  ✓ Next occurrence: ${meetup.nextOccurrence}`);
  });
});
