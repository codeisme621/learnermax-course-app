/**
 * CloudFront Signer Infrastructure Wrapper
 * Wraps @aws-sdk/cloudfront-signer to make it mockable in tests
 */

import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/cloudfront-signer';

export interface SignedUrlParams {
  url: string;
  keyPairId: string;
  privateKey: string;
  dateLessThan: string;
}

/**
 * Wrapper function for AWS CloudFront getSignedUrl
 * This abstraction allows easy mocking in tests
 */
export function getSignedUrl(params: SignedUrlParams): string {
  return awsGetSignedUrl(params);
}
