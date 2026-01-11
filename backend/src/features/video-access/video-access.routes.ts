/**
 * Video Access Routes
 *
 * Endpoints for obtaining CloudFront signed cookies for HLS video access.
 *
 * NOTE: This endpoint returns cookie VALUES as JSON, not Set-Cookie headers.
 * The Next.js Proxy is responsible for setting these as actual cookies with
 * proper attributes (httpOnly, secure, sameSite, domain, path).
 */

import express from 'express';
import type { Request, Response, Router } from 'express';
import { videoAccessService, VideoAccessForbiddenError } from './video-access.service.js';
import { getUserIdFromContext } from '../../lib/auth-utils.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = express.Router();
const logger = createLogger('VideoAccessRoutes');

/**
 * GET /api/courses/:courseId/video-access
 *
 * Returns signed cookie values for CloudFront HLS access.
 *
 * Response:
 * - 200: { success: true, cookies: { ... } }
 * - 401: Unauthorized (no authentication)
 * - 403: Forbidden (not enrolled in course)
 * - 500: Server error
 *
 * The cookies are scoped to /courses/{courseId}/* and grant access
 * to all HLS manifests and segments for that course.
 */
router.get('/:courseId/video-access', async (req: Request, res: Response) => {
  const { courseId } = req.params;

  logger.info('[GET /api/courses/:courseId/video-access] Request received', { courseId });

  // Authentication check
  const userId = getUserIdFromContext(req);
  if (!userId) {
    logger.warn('[GET /api/courses/:courseId/video-access] Unauthorized - no userId', { courseId });
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
    return;
  }

  try {
    // Get signed cookies (enrollment verified internally)
    const cookies = await videoAccessService.getVideoAccessCookies(userId, courseId);

    logger.info('[GET /api/courses/:courseId/video-access] Cookies generated', {
      userId,
      courseId,
    });

    // Return cookie values as JSON - Next.js Proxy sets them with proper attributes
    res.json({
      success: true,
      cookies: {
        'CloudFront-Policy': cookies['CloudFront-Policy'],
        'CloudFront-Signature': cookies['CloudFront-Signature'],
        'CloudFront-Key-Pair-Id': cookies['CloudFront-Key-Pair-Id'],
      },
    });
  } catch (error) {
    // Handle forbidden (not enrolled)
    if (error instanceof VideoAccessForbiddenError) {
      logger.warn('[GET /api/courses/:courseId/video-access] Not enrolled', {
        userId,
        courseId,
      });
      res.status(403).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Handle other errors
    logger.error('[GET /api/courses/:courseId/video-access] Failed to generate cookies', {
      userId,
      courseId,
      error,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to generate video access cookies',
    });
  }
});

export default router;
