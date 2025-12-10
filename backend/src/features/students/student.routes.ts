import express from 'express';
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { studentService } from './student.service.js';
import { getUserIdFromContext } from '../../lib/auth-utils.js';
import { createLogger } from '../../lib/logger.js';
import { createMetrics, MetricUnit } from '../../lib/metrics.js';

const router: Router = express.Router();
const logger = createLogger('StudentRoutes');
const metrics = createMetrics('LearnerMax/Backend', 'StudentService');

// Validation schema for early access signup
const earlyAccessSchema = z.object({
  courseId: z.string().min(1)
});

// GET /api/students/me - Get current student profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const student = await studentService.getStudent(userId);
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json(student);
  } catch (error) {
    logger.error('Failed to get student', { error });
    res.status(500).json({ error: 'Failed to get student' });
  }
});

// PATCH /api/students/me - Update current student profile
router.patch('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const updates = req.body;
    await studentService.updateStudent(userId, updates);

    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    logger.error('Failed to update student', { error });
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// POST /api/students/early-access - Mark student as interested in premium course
router.post('/early-access', async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromContext(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { courseId } = earlyAccessSchema.parse(req.body);

    // Update student record with early access interest
    const now = new Date().toISOString();
    await studentService.updateStudent(userId, {
      interestedInPremium: true,
      premiumInterestDate: now,
      updatedAt: now
    });

    // Get updated student to retrieve studentId for response
    const student = await studentService.getStudent(userId);

    // Track premium early access signup metric
    metrics.addMetric('PremiumEarlyAccessSignup', MetricUnit.Count, 1);
    metrics.publishStoredMetrics();

    res.json({
      success: true,
      message: "You're on the early access list!",
      student: {
        studentId: student?.userId,
        interestedInPremium: true,
        premiumInterestDate: now
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      });
      return;
    }
    logger.error('Error marking early access interest', { error });
    res.status(500).json({ error: 'Failed to process early access signup' });
  }
});

export default router;
