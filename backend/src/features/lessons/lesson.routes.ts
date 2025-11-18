import express from 'express';
import type { Request, Response, Router } from 'express';
import { lessonService } from './lesson.service.js';
import { enrollmentService } from '../enrollment/enrollment.service.js';
import { createVideoUrlProvider } from './services/video-url-service.js';
import { getUserIdFromContext } from '../../lib/auth-utils.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = express.Router();
const logger = createLogger('LessonRoutes');

/**
 * GET /api/lessons/:lessonId/video-url
 * Returns signed CloudFront URL for a lesson video
 * - Requires authentication
 * - Requires enrollment in the lesson's course
 * - URL expires after 30 minutes (configurable)
 */
router.get('/:lessonId/video-url', async (req: Request, res: Response) => {
  const { lessonId } = req.params;

  logger.info('[GET /api/lessons/:lessonId/video-url] Request received', { lessonId });

  // Authentication check
  const userId = getUserIdFromContext(req);
  if (!userId) {
    logger.warn('[GET /api/lessons/:lessonId/video-url] Unauthorized - no userId', { lessonId });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Fetch lesson
    const lesson = await lessonService.getLesson(lessonId);
    if (!lesson) {
      logger.warn('[GET /api/lessons/:lessonId/video-url] Lesson not found', {
        lessonId,
        userId,
      });
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    // Enrollment check
    const isEnrolled = await enrollmentService.checkEnrollment(userId, lesson.courseId);
    if (!isEnrolled) {
      logger.warn('[GET /api/lessons/:lessonId/video-url] Not enrolled in course', {
        lessonId,
        userId,
        courseId: lesson.courseId,
      });
      res.status(403).json({ error: 'Not enrolled in this course' });
      return;
    }

    // Generate signed CloudFront URL
    const videoUrlProvider = createVideoUrlProvider();
    const { url: videoUrl, expiresAt } = await videoUrlProvider.generateSignedUrl(
      lesson.videoKey
    );

    logger.info('[GET /api/lessons/:lessonId/video-url] Signed URL generated', {
      lessonId,
      userId,
      courseId: lesson.courseId,
      expiresAt,
    });

    res.json({
      videoUrl,
      expiresAt,
    });
  } catch (error) {
    logger.error('[GET /api/lessons/:lessonId/video-url] Failed to generate video URL', {
      lessonId,
      userId,
      error,
    });
    res.status(500).json({ error: 'Failed to generate video URL' });
  }
});

export default router;
