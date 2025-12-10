import express from 'express';
import type { Request, Response, Router } from 'express';
import { progressService } from './progress.service.js';
import { getUserIdFromContext } from '../../lib/auth-utils.js';
import { createLogger } from '../../lib/logger.js';
import { createMetrics, MetricUnit } from '../../lib/metrics.js';

const router: Router = express.Router();
const logger = createLogger('ProgressRoutes');
const metrics = createMetrics('LearnerMax/Backend', 'ProgressService');

/**
 * GET /api/progress/:courseId
 * Returns student's progress for a specific course
 * - Requires authentication
 * - Returns default empty progress if student hasn't started course
 */
router.get('/:courseId', async (req: Request, res: Response) => {
  const { courseId } = req.params;

  logger.info('[GET /api/progress/:courseId] Request received', { courseId });

  // Authentication check
  const userId = getUserIdFromContext(req);
  if (!userId) {
    logger.warn('[GET /api/progress/:courseId] Unauthorized - no userId', { courseId });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const progress = await progressService.getProgress(userId, courseId);

    logger.info('[GET /api/progress/:courseId] Progress retrieved', {
      courseId,
      userId,
      completedCount: progress.completedLessons.length,
      percentage: progress.percentage,
    });

    res.json(progress);
  } catch (error) {
    logger.error('[GET /api/progress/:courseId] Failed to fetch progress', {
      courseId,
      userId,
      error,
    });
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

/**
 * POST /api/progress
 * Marks a lesson as complete
 * - Requires authentication
 * - Request body: { courseId: string, lessonId: string }
 * - Updates completedLessons array (deduplicated)
 * - Recalculates percentage
 * - Updates lastAccessedLesson
 */
router.post('/', async (req: Request, res: Response) => {
  logger.info('[POST /api/progress] Request received', { body: req.body });

  // Authentication check
  const userId = getUserIdFromContext(req);
  if (!userId) {
    logger.warn('[POST /api/progress] Unauthorized - no userId');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Validate request body
  const { courseId, lessonId } = req.body;
  if (!courseId || typeof courseId !== 'string' || !lessonId || typeof lessonId !== 'string') {
    logger.warn('[POST /api/progress] Invalid request body', {
      userId,
      courseId,
      lessonId,
    });
    res.status(400).json({ error: 'Missing or invalid courseId or lessonId' });
    return;
  }

  try {
    const updatedProgress = await progressService.markLessonComplete(userId, courseId, lessonId);

    logger.info('[POST /api/progress] Lesson marked as complete', {
      userId,
      courseId,
      lessonId,
      completedCount: updatedProgress.completedLessons.length,
      percentage: updatedProgress.percentage,
    });

    // Track course completion if user just reached 100%
    if (updatedProgress.percentage === 100) {
      metrics.addMetric('CourseCompletionSuccess', MetricUnit.Count, 1);
      metrics.publishStoredMetrics();
      logger.info('[POST /api/progress] Course completed!', { userId, courseId });
    }

    res.json(updatedProgress);
  } catch (error) {
    logger.error('[POST /api/progress] Failed to mark lesson as complete', {
      userId,
      courseId,
      lessonId,
      error,
    });
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

/**
 * POST /api/progress/access
 * Tracks lesson access (when user clicks/opens a lesson)
 * - Requires authentication
 * - Request body: { courseId: string, lessonId: string }
 * - Only updates lastAccessedLesson (lightweight update)
 * - Does not affect completedLessons or percentage
 */
router.post('/access', async (req: Request, res: Response) => {
  logger.info('[POST /api/progress/access] Request received', { body: req.body });

  // Authentication check
  const userId = getUserIdFromContext(req);
  if (!userId) {
    logger.warn('[POST /api/progress/access] Unauthorized - no userId');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Validate request body
  const { courseId, lessonId } = req.body;
  if (!courseId || typeof courseId !== 'string' || !lessonId || typeof lessonId !== 'string') {
    logger.warn('[POST /api/progress/access] Invalid request body', {
      userId,
      courseId,
      lessonId,
    });
    res.status(400).json({ error: 'Missing or invalid courseId or lessonId' });
    return;
  }

  try {
    await progressService.trackLessonAccess(userId, courseId, lessonId);

    logger.info('[POST /api/progress/access] Lesson access tracked', {
      userId,
      courseId,
      lessonId,
    });

    res.status(204).send();
  } catch (error) {
    logger.error('[POST /api/progress/access] Failed to track lesson access', {
      userId,
      courseId,
      lessonId,
      error,
    });
    res.status(500).json({ error: 'Failed to track lesson access' });
  }
});

export default router;
