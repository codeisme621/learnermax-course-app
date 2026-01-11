/**
 * Video Access Service
 *
 * Handles generation of CloudFront signed cookies for HLS video access.
 * Verifies enrollment before issuing cookies scoped to a specific course.
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { generateSignedCookies, SignedCookies } from '../../lib/cloudfront-cookies.js';
import { enrollmentService } from '../enrollment/enrollment.service.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('VideoAccessService');

/**
 * VideoAccessService - Business logic for video access cookie generation
 */
export class VideoAccessService {
  private privateKey: string | null = null;
  private readonly secretsManagerClient: SecretsManagerClient;

  constructor() {
    this.secretsManagerClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Fetch CloudFront private key from Secrets Manager
   * Caches the key in memory to avoid repeated API calls (Lambda warm starts)
   */
  private async getPrivateKey(): Promise<string> {
    // Return cached key if available (Lambda warm start)
    if (this.privateKey) {
      return this.privateKey;
    }

    const secretName = process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_NAME;
    if (!secretName) {
      throw new Error('CLOUDFRONT_PRIVATE_KEY_SECRET_NAME environment variable is required');
    }

    logger.info('[getPrivateKey] Fetching CloudFront private key from Secrets Manager');

    try {
      const command = new GetSecretValueCommand({
        SecretId: secretName,
      });

      const response = await this.secretsManagerClient.send(command);

      if (!response.SecretString) {
        throw new Error('CloudFront private key not found in Secrets Manager');
      }

      // Cache for subsequent invocations in same Lambda instance
      this.privateKey = response.SecretString;
      logger.info('[getPrivateKey] Private key fetched and cached');

      return this.privateKey;
    } catch (error) {
      logger.error('[getPrivateKey] Failed to fetch private key', { error });
      throw new Error(
        `Failed to fetch CloudFront private key: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get signed cookies for video access
   *
   * 1. Verifies user is enrolled in the course
   * 2. Generates CloudFront signed cookies scoped to the course path
   *
   * @param userId - Authenticated user ID
   * @param courseId - Course ID to grant access to
   * @returns Signed cookie values
   * @throws Error if not enrolled or configuration is missing
   */
  async getVideoAccessCookies(userId: string, courseId: string): Promise<SignedCookies> {
    logger.info('[getVideoAccessCookies] Checking enrollment', { userId, courseId });

    // Verify enrollment first
    const isEnrolled = await enrollmentService.checkEnrollment(userId, courseId);
    if (!isEnrolled) {
      logger.warn('[getVideoAccessCookies] User not enrolled', { userId, courseId });
      throw new VideoAccessForbiddenError('Not enrolled in this course');
    }

    logger.info('[getVideoAccessCookies] User enrolled, generating cookies', { userId, courseId });

    // Get configuration from environment
    const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;

    if (!keyPairId) {
      throw new Error('CLOUDFRONT_KEY_PAIR_ID environment variable is required');
    }

    if (!cloudfrontDomain) {
      throw new Error('CLOUDFRONT_DOMAIN environment variable is required');
    }

    // Fetch private key (cached after first call)
    const privateKey = await this.getPrivateKey();

    // Generate signed cookies
    const cookies = generateSignedCookies({
      courseId,
      privateKey,
      keyPairId,
      cloudfrontDomain,
      expirySeconds: 86400, // 24 hours (safety net - session cookies deleted on browser close)
    });

    logger.info('[getVideoAccessCookies] Cookies generated successfully', { userId, courseId });

    return cookies;
  }
}

/**
 * Custom error for forbidden access (not enrolled)
 */
export class VideoAccessForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoAccessForbiddenError';
  }
}

// Singleton instance
export const videoAccessService = new VideoAccessService();
