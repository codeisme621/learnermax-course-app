/**
 * Video URL Service - Generates signed URLs for secure video delivery
 *
 * Uses strategy pattern to allow swapping video providers (CloudFront, Vimeo, etc.)
 * without changing calling code.
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { getSignedUrl } from '../../../lib/cloudfront-signer.js';

/**
 * VideoUrlProvider - Interface for video URL generation
 * Allows swapping between different video delivery providers
 */
export interface VideoUrlProvider {
  /**
   * Generate a signed URL for secure video access
   * @param videoKey - S3 object key (e.g., "courses/spec-driven-dev-mini/lesson-1.mp4")
   * @returns Signed URL and expiration timestamp
   */
  generateSignedUrl(videoKey: string): Promise<{
    url: string;
    expiresAt: number;  // Unix timestamp (seconds since epoch)
  }>;
}

/**
 * CloudFrontUrlProvider - Implementation for AWS CloudFront signed URLs
 *
 * Features:
 * - Private key caching (fetched once per Lambda cold start)
 * - Configurable URL expiration
 * - Security: Uses CloudFront signed URLs with key groups
 */
export class CloudFrontUrlProvider implements VideoUrlProvider {
  private privateKey: string | null = null;
  private readonly secretsManagerClient: SecretsManagerClient;

  constructor(
    private readonly cloudFrontDomain: string,
    private readonly keyPairId: string,
    private readonly privateKeySecretName: string,
    private readonly urlExpiryMinutes: number,
    private readonly signUrlFn: typeof getSignedUrl = getSignedUrl,
  ) {
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

    // Fetch from Secrets Manager (Lambda cold start)
    try {
      const command = new GetSecretValueCommand({
        SecretId: this.privateKeySecretName,
      });

      const response = await this.secretsManagerClient.send(command);

      if (!response.SecretString) {
        throw new Error('CloudFront private key not found in Secrets Manager');
      }

      // Cache for subsequent invocations in same Lambda instance
      this.privateKey = response.SecretString;
      return this.privateKey;
    } catch (error) {
      throw new Error(
        `Failed to fetch CloudFront private key from Secrets Manager: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate CloudFront signed URL for video access
   * @param videoKey - S3 object key (e.g., "courses/spec-driven-dev-mini/lesson-1.mp4")
   * @returns Signed URL with expiration timestamp
   */
  async generateSignedUrl(videoKey: string): Promise<{ url: string; expiresAt: number }> {
    const privateKey = await this.getPrivateKey();

    // Calculate expiration time
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + this.urlExpiryMinutes);

    // CloudFront URL format: https://<domain>/<videoKey>
    const cloudFrontUrl = `https://${this.cloudFrontDomain}/${videoKey}`;

    // Generate signed URL using injected function (or default AWS SDK)
    const signedUrl = this.signUrlFn({
      url: cloudFrontUrl,
      keyPairId: this.keyPairId,
      privateKey,
      dateLessThan: expirationTime.toISOString(),
    });

    return {
      url: signedUrl,
      expiresAt: Math.floor(expirationTime.getTime() / 1000), // Unix timestamp in seconds
    };
  }
}

/**
 * Factory function to create VideoUrlProvider instance
 * Reads configuration from environment variables
 *
 * Environment variables required:
 * - CLOUDFRONT_DOMAIN: CloudFront distribution domain
 * - CLOUDFRONT_KEY_PAIR_ID: CloudFront key pair ID (APKA...)
 * - CLOUDFRONT_PRIVATE_KEY_SECRET_NAME: Secrets Manager secret name
 * - VIDEO_URL_EXPIRY_MINUTES: URL expiration time in minutes (default: 30)
 */
export function createVideoUrlProvider(): VideoUrlProvider {
  const cloudFrontDomain = process.env.CLOUDFRONT_DOMAIN;
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
  const privateKeySecretName = process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_NAME;
  const urlExpiryMinutes = parseInt(process.env.VIDEO_URL_EXPIRY_MINUTES || '30', 10);

  if (!cloudFrontDomain) {
    throw new Error('CLOUDFRONT_DOMAIN environment variable is required');
  }

  if (!keyPairId) {
    throw new Error('CLOUDFRONT_KEY_PAIR_ID environment variable is required');
  }

  if (!privateKeySecretName) {
    throw new Error('CLOUDFRONT_PRIVATE_KEY_SECRET_NAME environment variable is required');
  }

  return new CloudFrontUrlProvider(
    cloudFrontDomain,
    keyPairId,
    privateKeySecretName,
    urlExpiryMinutes,
  );
}
