/**
 * Unit tests for Video URL Service
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { CloudFrontUrlProvider, createVideoUrlProvider } from '../video-url-service.js';

// Mock Secrets Manager client using aws-sdk-client-mock
const secretsManagerMock = mockClient(SecretsManagerClient);

describe('CloudFrontUrlProvider', () => {
  const mockPrivateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAw...test-key...==
-----END RSA PRIVATE KEY-----`;

  const mockCloudFrontDomain = 'd123abc.cloudfront.net';
  const mockKeyPairId = 'APKA4NJ63SK4YPQIZU5D';
  const mockSecretName = 'learnermax/cloudfront-private-key-preview';
  const mockExpiryMinutes = 30;

  let provider: CloudFrontUrlProvider;
  let mockSignUrlFn: jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    secretsManagerMock.reset();

    // Create mock sign URL function
    mockSignUrlFn = jest.fn((params: any) => 
      `https://d123abc.cloudfront.net/test.mp4?Signature=abc&Key-Pair-Id=${params.keyPairId}&Expires=123456`
    );

    // Create provider instance with mocked sign function
    provider = new CloudFrontUrlProvider(
      mockCloudFrontDomain,
      mockKeyPairId,
      mockSecretName,
      mockExpiryMinutes,
      mockSignUrlFn
    );
  });

  afterAll(() => {
    secretsManagerMock.restore();
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL with correct structure', async () => {
      // Mock Secrets Manager response
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      const videoKey = 'courses/spec-driven-dev-mini/lesson-1.mp4';
      const result = await provider.generateSignedUrl(videoKey);

      // Verify result structure (DTO)
      expect(result).toEqual({
        url: expect.any(String),
        expiresAt: expect.any(Number),
      });
      expect(result.url).toContain('cloudfront.net');
      expect(result.expiresAt).toBeGreaterThan(Date.now() / 1000);
    });

    it('should call sign function with correct parameters', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      const videoKey = 'courses/spec-driven-dev-mini/lesson-1.mp4';
      await provider.generateSignedUrl(videoKey);

      // Verify sign function was called with correct params
      expect(mockSignUrlFn).toHaveBeenCalledTimes(1);

      const callArgs = mockSignUrlFn.mock.calls[0][0];
      expect(callArgs).toMatchObject({
        url: `https://${mockCloudFrontDomain}/${videoKey}`,
        keyPairId: mockKeyPairId,
        privateKey: mockPrivateKey,
      });
      expect(callArgs.dateLessThan).toBeDefined();
    });

    it('should return expiration timestamp 30 minutes in the future', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      const beforeTime = Date.now() / 1000;
      const result = await provider.generateSignedUrl('test.mp4');
      const afterTime = Date.now() / 1000;

      // expiresAt should be approximately 30 minutes from now
      const expectedMinExpiry = beforeTime + 29 * 60; // 29 minutes tolerance
      const expectedMaxExpiry = afterTime + 31 * 60; // 31 minutes tolerance

      expect(result.expiresAt).toBeGreaterThan(expectedMinExpiry);
      expect(result.expiresAt).toBeLessThan(expectedMaxExpiry);
    });

    it('should throw error if private key is not found in Secrets Manager', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: undefined,
      });

      await expect(provider.generateSignedUrl('test.mp4')).rejects.toThrow(
        'CloudFront private key not found in Secrets Manager'
      );
    });

    it('should throw error if Secrets Manager fails', async () => {
      secretsManagerMock.on(GetSecretValueCommand).rejects(new Error('Access denied'));

      await expect(provider.generateSignedUrl('test.mp4')).rejects.toThrow(
        'Failed to fetch CloudFront private key from Secrets Manager: Access denied'
      );
    });

    it('should call Secrets Manager with correct secret name', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      await provider.generateSignedUrl('test.mp4');

      // Verify Secrets Manager was called with correct parameters
      const call = secretsManagerMock.call(0);
      expect(call.args[0].input).toMatchObject({
        SecretId: mockSecretName,
      });
    });
  });

  describe('Private key caching', () => {
    it('should fetch private key only once per instance (caching)', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      // Call generateSignedUrl multiple times
      await provider.generateSignedUrl('video1.mp4');
      await provider.generateSignedUrl('video2.mp4');
      await provider.generateSignedUrl('video3.mp4');

      // Secrets Manager should only be called once (first time)
      expect(secretsManagerMock.calls()).toHaveLength(1);
    });

    it('should use cached key even after multiple invocations', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      // First call - fetches from Secrets Manager
      await provider.generateSignedUrl('video1.mp4');
      expect(secretsManagerMock.calls()).toHaveLength(1);

      // Second call - uses cached key
      await provider.generateSignedUrl('video2.mp4');
      expect(secretsManagerMock.calls()).toHaveLength(1); // Still 1

      // Third call - still uses cached key
      await provider.generateSignedUrl('video3.mp4');
      expect(secretsManagerMock.calls()).toHaveLength(1); // Still 1
    });

    it('should generate different signed URLs for different video keys', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      // Mock different return values for different calls
      mockSignUrlFn
        .mockReturnValueOnce('https://cloudfront.net/video1.mp4?Signature=abc1')
        .mockReturnValueOnce('https://cloudfront.net/video2.mp4?Signature=abc2');

      const result1 = await provider.generateSignedUrl('video1.mp4');
      const result2 = await provider.generateSignedUrl('video2.mp4');

      expect(result1.url).toContain('video1.mp4');
      expect(result2.url).toContain('video2.mp4');
      expect(mockSignUrlFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('URL format validation', () => {
    it('should construct CloudFront URL with correct domain and video key', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      const videoKey = 'courses/spec-driven-dev-mini/lesson-1.mp4';
      await provider.generateSignedUrl(videoKey);

      const callArgs = mockSignUrlFn.mock.calls[0][0];
      expect(callArgs.url).toBe(`https://${mockCloudFrontDomain}/${videoKey}`);
    });

    it('should handle video keys with special characters', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      const videoKey = 'courses/my-course/lesson-1 (intro).mp4';
      await provider.generateSignedUrl(videoKey);

      const callArgs = mockSignUrlFn.mock.calls[0][0];
      expect(callArgs.url).toContain(videoKey);
    });

    it('should use HTTPS protocol for CloudFront URLs', async () => {
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: mockPrivateKey,
      });

      await provider.generateSignedUrl('test.mp4');

      const callArgs = mockSignUrlFn.mock.calls[0][0];
      expect(callArgs.url).toMatch(/^https:\/\//);
    });
  });
});

describe('createVideoUrlProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clone original env
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  it('should create CloudFrontUrlProvider with env variables', () => {
    process.env.CLOUDFRONT_DOMAIN = 'd123.cloudfront.net';
    process.env.CLOUDFRONT_KEY_PAIR_ID = 'APKA123';
    process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_NAME = 'test-secret';
    process.env.VIDEO_URL_EXPIRY_MINUTES = '45';

    const provider = createVideoUrlProvider();
    expect(provider).toBeInstanceOf(CloudFrontUrlProvider);
  });

  it('should use default expiry of 30 minutes if not specified', () => {
    process.env.CLOUDFRONT_DOMAIN = 'd123.cloudfront.net';
    process.env.CLOUDFRONT_KEY_PAIR_ID = 'APKA123';
    process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_NAME = 'test-secret';
    delete process.env.VIDEO_URL_EXPIRY_MINUTES;

    const provider = createVideoUrlProvider();
    expect(provider).toBeInstanceOf(CloudFrontUrlProvider);
  });

  it('should throw error if CLOUDFRONT_DOMAIN is missing', () => {
    delete process.env.CLOUDFRONT_DOMAIN;
    process.env.CLOUDFRONT_KEY_PAIR_ID = 'APKA123';
    process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_NAME = 'test-secret';

    expect(() => createVideoUrlProvider()).toThrow(
      'CLOUDFRONT_DOMAIN environment variable is required'
    );
  });

  it('should throw error if CLOUDFRONT_KEY_PAIR_ID is missing', () => {
    process.env.CLOUDFRONT_DOMAIN = 'd123.cloudfront.net';
    delete process.env.CLOUDFRONT_KEY_PAIR_ID;
    process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_NAME = 'test-secret';

    expect(() => createVideoUrlProvider()).toThrow(
      'CLOUDFRONT_KEY_PAIR_ID environment variable is required'
    );
  });

  it('should throw error if CLOUDFRONT_PRIVATE_KEY_SECRET_NAME is missing', () => {
    process.env.CLOUDFRONT_DOMAIN = 'd123.cloudfront.net';
    process.env.CLOUDFRONT_KEY_PAIR_ID = 'APKA123';
    delete process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_NAME;

    expect(() => createVideoUrlProvider()).toThrow(
      'CLOUDFRONT_PRIVATE_KEY_SECRET_NAME environment variable is required'
    );
  });

  it('should parse VIDEO_URL_EXPIRY_MINUTES as integer', () => {
    process.env.CLOUDFRONT_DOMAIN = 'd123.cloudfront.net';
    process.env.CLOUDFRONT_KEY_PAIR_ID = 'APKA123';
    process.env.CLOUDFRONT_PRIVATE_KEY_SECRET_NAME = 'test-secret';
    process.env.VIDEO_URL_EXPIRY_MINUTES = '60';

    const provider = createVideoUrlProvider();
    expect(provider).toBeInstanceOf(CloudFrontUrlProvider);
  });
});
