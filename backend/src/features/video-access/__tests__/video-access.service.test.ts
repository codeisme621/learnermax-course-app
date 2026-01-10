/**
 * Unit tests for Video Access Service
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Mock enrollmentService before importing the service
const mockCheckEnrollment = jest.fn<() => Promise<boolean>>();
jest.unstable_mockModule('../../enrollment/enrollment.service.js', () => ({
  enrollmentService: {
    checkEnrollment: mockCheckEnrollment,
  },
}));

// Mock cloudfront-cookies module
const mockGenerateSignedCookies = jest.fn();
jest.unstable_mockModule('../../../lib/cloudfront-cookies.js', () => ({
  generateSignedCookies: mockGenerateSignedCookies,
}));

// Import after mocks
const { VideoAccessService, VideoAccessForbiddenError } = await import('../video-access.service.js');

// Mock Secrets Manager client
const secretsManagerMock = mockClient(SecretsManagerClient);

describe('VideoAccessService', () => {
  const mockPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAw...test-key...==
-----END RSA PRIVATE KEY-----`;

  const originalEnv = process.env;

  beforeEach(() => {
    // Reset all mocks
    secretsManagerMock.reset();
    mockCheckEnrollment.mockReset();
    mockGenerateSignedCookies.mockReset();

    // Set required environment variables
    process.env = {
      ...originalEnv,
      CLOUDFRONT_DOMAIN: 'video.learnwithrico.com',
      CLOUDFRONT_KEY_PAIR_ID: 'APKA4NJ63SK4YPQIZU5D',
      CLOUDFRONT_PRIVATE_KEY_SECRET_NAME: 'learnermax/cloudfront-private-key',
      AWS_REGION: 'us-east-1',
    };

    // Default mock responses
    secretsManagerMock.on(GetSecretValueCommand).resolves({
      SecretString: mockPrivateKey,
    });

    mockGenerateSignedCookies.mockReturnValue({
      'CloudFront-Policy': 'test-policy-value',
      'CloudFront-Signature': 'test-signature-value',
      'CloudFront-Key-Pair-Id': 'APKA4NJ63SK4YPQIZU5D',
    });
  });

  afterAll(() => {
    secretsManagerMock.restore();
    process.env = originalEnv;
  });

  describe('getVideoAccessCookies', () => {
    it('should return signed cookies for enrolled user', async () => {
      mockCheckEnrollment.mockResolvedValue(true);

      const service = new VideoAccessService();
      const cookies = await service.getVideoAccessCookies('user-123', 'course-abc');

      expect(cookies).toEqual({
        'CloudFront-Policy': 'test-policy-value',
        'CloudFront-Signature': 'test-signature-value',
        'CloudFront-Key-Pair-Id': 'APKA4NJ63SK4YPQIZU5D',
      });
    });

    it('should verify enrollment before generating cookies', async () => {
      mockCheckEnrollment.mockResolvedValue(true);

      const service = new VideoAccessService();
      await service.getVideoAccessCookies('user-123', 'course-abc');

      expect(mockCheckEnrollment).toHaveBeenCalledWith('user-123', 'course-abc');
    });

    it('should throw VideoAccessForbiddenError if not enrolled', async () => {
      mockCheckEnrollment.mockResolvedValue(false);

      const service = new VideoAccessService();

      await expect(
        service.getVideoAccessCookies('user-123', 'course-abc')
      ).rejects.toThrow(VideoAccessForbiddenError);

      await expect(
        service.getVideoAccessCookies('user-123', 'course-abc')
      ).rejects.toThrow('Not enrolled in this course');
    });

    it('should not call generateSignedCookies if not enrolled', async () => {
      mockCheckEnrollment.mockResolvedValue(false);

      const service = new VideoAccessService();

      try {
        await service.getVideoAccessCookies('user-123', 'course-abc');
      } catch {
        // Expected to throw
      }

      expect(mockGenerateSignedCookies).not.toHaveBeenCalled();
    });

    it('should call generateSignedCookies with correct parameters', async () => {
      mockCheckEnrollment.mockResolvedValue(true);

      const service = new VideoAccessService();
      await service.getVideoAccessCookies('user-123', 'course-abc');

      expect(mockGenerateSignedCookies).toHaveBeenCalledWith({
        courseId: 'course-abc',
        privateKey: mockPrivateKey,
        keyPairId: 'APKA4NJ63SK4YPQIZU5D',
        cloudfrontDomain: 'video.learnwithrico.com',
        expirySeconds: 86400,
      });
    });

    it('should throw error if CLOUDFRONT_KEY_PAIR_ID is missing', async () => {
      delete process.env.CLOUDFRONT_KEY_PAIR_ID;
      mockCheckEnrollment.mockResolvedValue(true);

      const service = new VideoAccessService();

      await expect(
        service.getVideoAccessCookies('user-123', 'course-abc')
      ).rejects.toThrow('CLOUDFRONT_KEY_PAIR_ID environment variable is required');
    });

    it('should throw error if CLOUDFRONT_DOMAIN is missing', async () => {
      delete process.env.CLOUDFRONT_DOMAIN;
      mockCheckEnrollment.mockResolvedValue(true);

      const service = new VideoAccessService();

      await expect(
        service.getVideoAccessCookies('user-123', 'course-abc')
      ).rejects.toThrow('CLOUDFRONT_DOMAIN environment variable is required');
    });

    it('should throw error if CLOUDFRONT_PRIVATE_KEY_SECRET_NAME is missing', async () => {
      delete process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_NAME;
      mockCheckEnrollment.mockResolvedValue(true);

      const service = new VideoAccessService();

      await expect(
        service.getVideoAccessCookies('user-123', 'course-abc')
      ).rejects.toThrow('CLOUDFRONT_PRIVATE_KEY_SECRET_NAME environment variable is required');
    });
  });

  describe('Private key caching', () => {
    it('should fetch private key from Secrets Manager', async () => {
      mockCheckEnrollment.mockResolvedValue(true);

      const service = new VideoAccessService();
      await service.getVideoAccessCookies('user-123', 'course-abc');

      expect(secretsManagerMock.calls()).toHaveLength(1);
    });

    it('should cache private key after first fetch', async () => {
      mockCheckEnrollment.mockResolvedValue(true);

      const service = new VideoAccessService();

      // Multiple calls should only fetch key once
      await service.getVideoAccessCookies('user-123', 'course-1');
      await service.getVideoAccessCookies('user-123', 'course-2');
      await service.getVideoAccessCookies('user-456', 'course-1');

      expect(secretsManagerMock.calls()).toHaveLength(1);
    });

    it('should throw error if private key not found in Secrets Manager', async () => {
      mockCheckEnrollment.mockResolvedValue(true);
      secretsManagerMock.reset();
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: undefined,
      });

      const service = new VideoAccessService();

      await expect(
        service.getVideoAccessCookies('user-123', 'course-abc')
      ).rejects.toThrow('CloudFront private key not found in Secrets Manager');
    });

    it('should throw error if Secrets Manager fails', async () => {
      mockCheckEnrollment.mockResolvedValue(true);
      secretsManagerMock.reset();
      secretsManagerMock.on(GetSecretValueCommand).rejects(new Error('Access denied'));

      const service = new VideoAccessService();

      await expect(
        service.getVideoAccessCookies('user-123', 'course-abc')
      ).rejects.toThrow('Failed to fetch CloudFront private key: Access denied');
    });
  });
});

describe('VideoAccessForbiddenError', () => {
  it('should have correct name property', () => {
    const error = new VideoAccessForbiddenError('test message');
    expect(error.name).toBe('VideoAccessForbiddenError');
  });

  it('should have correct message', () => {
    const error = new VideoAccessForbiddenError('Not enrolled in this course');
    expect(error.message).toBe('Not enrolled in this course');
  });

  it('should be instance of Error', () => {
    const error = new VideoAccessForbiddenError('test');
    expect(error).toBeInstanceOf(Error);
  });
});
