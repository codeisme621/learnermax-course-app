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
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { courseId } = req.body;
    if (!courseId) {
      res.status(400).json({ error: 'courseId is required' });
      return;
    }

    const result = await enrollmentService.enrollUser(userId, courseId);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Enrollment failed', { error });
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// GET /api/enrollments - Get user's enrollments
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const enrollments = await enrollmentRepository.getUserEnrollments(userId);
    res.json(enrollments);
  } catch (error) {
    logger.error('Failed to get enrollments', { error });
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// GET /api/enrollments/check/:courseId - Check enrollment status
router.get('/check/:courseId', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { courseId } = req.params;
    const enrolled = await enrollmentService.checkEnrollment(userId, courseId);
    res.json({ enrolled });
  } catch (error) {
    logger.error('Failed to check enrollment', { error });
    res.status(500).json({ error: 'Failed to check enrollment' });
  }
});

export default router;
