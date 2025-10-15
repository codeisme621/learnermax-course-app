import express from 'express';
import type { Request, Response, Router } from 'express';
import { enrollmentService } from './enrollment.service.js';
import { enrollmentRepository } from './enrollment.repository.js';
import { getUserIdFromContext } from '../../lib/auth-utils.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = express.Router();
const logger = createLogger('EnrollmentRoutes');

// POST /api/enrollments - Create enrollment
router.post('/', async (req: Request, res: Response) => {
  logger.info('[POST /api/enrollments] Request received', { body: req.body });

  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      logger.warn('[POST /api/enrollments] Unauthorized - no userId in context');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { courseId } = req.body;
    if (!courseId) {
      logger.warn('[POST /api/enrollments] Bad request - courseId missing', { userId });
      res.status(400).json({ error: 'courseId is required' });
      return;
    }

    logger.info('[POST /api/enrollments] Enrolling user', { userId, courseId });
    const result = await enrollmentService.enrollUser(userId, courseId);
    logger.info('[POST /api/enrollments] Enrollment successful', {
      userId,
      courseId,
      status: result.status,
      enrollmentType: result.enrollment?.enrollmentType
    });
    res.status(201).json(result);
  } catch (error) {
    logger.error('[POST /api/enrollments] Enrollment failed', { error, body: req.body });
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// GET /api/enrollments - Get user's enrollments
router.get('/', async (req: Request, res: Response) => {
  logger.info('[GET /api/enrollments] Request received');

  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      logger.warn('[GET /api/enrollments] Unauthorized - no userId in context');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    logger.info('[GET /api/enrollments] Fetching enrollments for user', { userId });
    const enrollments = await enrollmentRepository.getUserEnrollments(userId);
    logger.info('[GET /api/enrollments] Successfully fetched enrollments', {
      userId,
      count: enrollments.length,
      courseIds: enrollments.map(e => e.courseId)
    });
    res.json(enrollments);
  } catch (error) {
    logger.error('[GET /api/enrollments] Failed to get enrollments', { error });
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// GET /api/enrollments/check/:courseId - Check enrollment status
router.get('/check/:courseId', async (req: Request, res: Response) => {
  const { courseId } = req.params;
  logger.info('[GET /api/enrollments/check/:courseId] Request received', { courseId });

  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      logger.warn('[GET /api/enrollments/check/:courseId] Unauthorized - no userId in context', { courseId });
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    logger.info('[GET /api/enrollments/check/:courseId] Checking enrollment', { userId, courseId });
    const enrolled = await enrollmentService.checkEnrollment(userId, courseId);
    logger.info('[GET /api/enrollments/check/:courseId] Check complete', { userId, courseId, enrolled });
    res.json({ enrolled });
  } catch (error) {
    logger.error('[GET /api/enrollments/check/:courseId] Failed to check enrollment', { courseId, error });
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
});

export default router;
