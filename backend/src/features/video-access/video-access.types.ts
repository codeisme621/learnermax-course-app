/**
 * Video Access Types
 *
 * Types for the video-access feature that handles CloudFront signed cookies
 * for HLS video streaming.
 */

/**
 * Response from GET /api/courses/:courseId/video-access
 *
 * Returns signed cookie values as JSON (not Set-Cookie headers).
 * The Next.js Proxy is responsible for setting these as cookies with
 * proper attributes (httpOnly, secure, sameSite, domain, path).
 */
export interface VideoAccessResponse {
  success: true;
  cookies: {
    'CloudFront-Policy': string;
    'CloudFront-Signature': string;
    'CloudFront-Key-Pair-Id': string;
  };
}

/**
 * Error response when user is not enrolled
 */
export interface VideoAccessErrorResponse {
  success: false;
  error: string;
}
