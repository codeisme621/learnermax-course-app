import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../../lib/dynamodb.js';
import { createLogger } from '../../lib/logger.js';
import type { MeetupSignupEntity } from './meetups.types.js';

const logger = createLogger('MeetupsRepository');

const getTableName = (): string => {
  const tableName = process.env.EDUCATION_TABLE_NAME;
  if (!tableName) {
    throw new Error('EDUCATION_TABLE_NAME environment variable is not set');
  }
  return tableName;
};

/**
 * Repository for meetup signup operations in DynamoDB
 */
export const meetupsRepository = {
  /**
   * Check if a student is signed up for a meetup
   */
  async getSignup(
    userId: string,
    meetupId: string
  ): Promise<MeetupSignupEntity | null> {
    logger.info('[getSignup] Fetching signup', { userId, meetupId });

    const result = await docClient.send(
      new GetCommand({
        TableName: getTableName(),
        Key: {
          PK: `STUDENT#${userId}`,
          SK: `MEETUP_SIGNUP#${meetupId}`,
        },
      })
    );

    if (!result.Item) {
      logger.info('[getSignup] Signup not found', { userId, meetupId });
      return null;
    }

    logger.info('[getSignup] Signup found', { userId, meetupId });
    return result.Item as MeetupSignupEntity;
  },

  /**
   * Sign up a student for a meetup (idempotent)
   * Throws ConditionalCheckFailedException if signup already exists
   */
  async createSignup(
    userId: string,
    meetupId: string
  ): Promise<MeetupSignupEntity> {
    logger.info('[createSignup] Creating signup', { userId, meetupId });

    const now = new Date().toISOString();
    const signup: MeetupSignupEntity = {
      PK: `STUDENT#${userId}`,
      SK: `MEETUP_SIGNUP#${meetupId}`,
      meetupId,
      signedUpAt: now,
      entityType: 'MEETUP_SIGNUP',
    };

    await docClient.send(
      new PutCommand({
        TableName: getTableName(),
        Item: signup,
        // Idempotent: Don't overwrite if already exists
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );

    logger.info('[createSignup] Signup created', { userId, meetupId });
    return signup;
  },

  /**
   * Get all meetup signups for a student
   */
  async getStudentSignups(userId: string): Promise<MeetupSignupEntity[]> {
    logger.info('[getStudentSignups] Fetching signups', { userId });

    const result = await docClient.send(
      new QueryCommand({
        TableName: getTableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `STUDENT#${userId}`,
          ':sk': 'MEETUP_SIGNUP#',
        },
      })
    );

    const signups = (result.Items || []) as MeetupSignupEntity[];
    logger.info('[getStudentSignups] Signups retrieved', {
      userId,
      count: signups.length,
    });

    return signups;
  },

  /**
   * Get all signed-up meetup IDs for a student
   * Used by student service to populate signedUpMeetups field
   */
  async getSignedUpMeetupIds(userId: string): Promise<string[]> {
    const signups = await this.getStudentSignups(userId);
    return signups.map((s) => s.meetupId);
  },
};
