import express from 'express';
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { feedbackRepository } from './feedback.repository.js';
import { getUserIdFromContext } from '../../lib/auth-utils.js';
import { createLogger } from '../../lib/logger.js';
import type { Feedback } from './feedback.types.js';

const router: Router = express.Router();
const logger = createLogger('FeedbackRoutes');

// Validation schema for feedback submission
const createFeedbackSchema = z.object({
  feedback: z.string().min(1, 'Feedback is required'),
  category: z.enum(['bug', 'feature', 'general']),
  rating: z.number().int().min(1).max(5).optional()
}).refine(
  (data) => {
    // Rating is only allowed for 'general' category
    if (data.rating !== undefined && data.category !== 'general') {
      return false;
    }
    return true;
  },
  { message: 'Rating is only allowed for general feedback' }
);

// POST /api/feedback - Submit feedback
router.post('/', async (req: Request, res: Response) => {
  try {
    logger.info('[POST /api/feedback] Request received', { body: req.body });

    const userId = getUserIdFromContext(req);
    if (!userId) {
      logger.warn('[POST /api/feedback] Unauthorized request');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const validatedData = createFeedbackSchema.parse(req.body);

    const feedback: Feedback = {
      feedbackId: randomUUID(),
      userId,
      feedback: validatedData.feedback,
      category: validatedData.category,
      rating: validatedData.rating,
      createdAt: new Date().toISOString()
    };

    await feedbackRepository.create(feedback);

    logger.info('[POST /api/feedback] Feedback created successfully', {
      feedbackId: feedback.feedbackId,
      userId,
      category: feedback.category
    });

    res.status(201).json({ feedbackId: feedback.feedbackId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('[POST /api/feedback] Validation error', { errors: error.errors });
      res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      });
      return;
    }
    logger.error('[POST /api/feedback] Failed to create feedback', { error });
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

export default router;
