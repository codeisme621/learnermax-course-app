/**
 * CloudFront Signed Cookies Utility
 *
 * Generates signed cookies for HLS video access via CloudFront.
 * Uses custom policy to scope access to a specific course path.
 *
 * Reference: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html
 */

import { getSignedCookies as awsGetSignedCookies } from '@aws-sdk/cloudfront-signer';

/**
 * CloudFront signed cookie names
 */
export interface SignedCookies {
  'CloudFront-Policy': string;
  'CloudFront-Signature': string;
  'CloudFront-Key-Pair-Id': string;
}

/**
 * Parameters for generating signed cookies
 */
export interface SignedCookiesParams {
  courseId: string;
  privateKey: string;
  keyPairId: string;
  cloudfrontDomain: string;
  expirySeconds?: number; // Default: 86400 (24 hours)
}

/**
 * Generate CloudFront signed cookies for a course path.
 *
 * The cookies grant access to all HLS files under /courses/{courseId}/*
 *
 * Why session cookies with 24-hour policy expiry:
 * - Session cookies (no Expires/Max-Age) are deleted when browser closes
 * - Policy expiry is a safety net in case browser doesn't close
 * - Perfect for binge-watching: issue once per page load, no refresh needed
 *
 * @param params - Signing parameters
 * @returns Signed cookie values (to be set by Next.js Proxy)
 */
export function generateSignedCookies(params: SignedCookiesParams): SignedCookies {
  const {
    courseId,
    privateKey,
    keyPairId,
    cloudfrontDomain,
    expirySeconds = 86400, // 24 hours default
  } = params;

  // Custom policy restricts access to specific course path
  const policy = {
    Statement: [
      {
        Resource: `https://${cloudfrontDomain}/courses/${courseId}/*`,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': Math.floor(Date.now() / 1000) + expirySeconds,
          },
        },
      },
    ],
  };

  // Generate signed cookies using AWS SDK
  const cookies = awsGetSignedCookies({
    policy: JSON.stringify(policy),
    privateKey,
    keyPairId,
  });

  return cookies as SignedCookies;
}

/**
 * Wrapper for testing - allows mocking the AWS SDK function
 */
export function getSignedCookies(params: {
  policy: string;
  privateKey: string;
  keyPairId: string;
}): SignedCookies {
  return awsGetSignedCookies(params) as SignedCookies;
}
