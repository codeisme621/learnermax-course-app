import express from 'express';
import type { Request, Response, Router } from 'express';
import { getUserIdFromContext, getUserClaimsFromContext } from '../../lib/auth-utils.js';
import { createLogger } from '../../lib/logger.js';
import { meetupsService } from './meetups.service.js';

const router: Router = express.Router();
const logger = createLogger('MeetupsRoutes');

/**
 * GET /api/meetups
 * Get all meetups with signup status for authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  logger.info('[GET /api/meetups] Request received');

  // Authentication check
  const userId = getUserIdFromContext(req);
  if (!userId) {
    logger.warn('[GET /api/meetups] Unauthorized');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const meetups = await meetupsService.getMeetups(userId);
    logger.info('[GET /api/meetups] Success', { userId, count: meetups.length });
    res.json(meetups);
  } catch (error) {
    logger.error('[GET /api/meetups] Failed', { userId, error });
    res.status(500).json({ error: 'Failed to fetch meetups' });
  }
});

/**
 * POST /api/meetups/:meetupId/signup
 * Sign up for a meetup
 */
router.post('/:meetupId/signup', async (req: Request, res: Response) => {
  const { meetupId } = req.params;
  logger.info('[POST /api/meetups/:meetupId/signup] Request received', {
    meetupId,
  });

  // Authentication check
  const userId = getUserIdFromContext(req);
  const claims = getUserClaimsFromContext(req);

  if (!userId || !claims) {
    logger.warn('[POST /api/meetups/:meetupId/signup] Unauthorized', {
      meetupId,
    });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const studentEmail = claims.email || '';
  const studentName = claims.name || 'Student';

  try {
    await meetupsService.signupForMeetup(userId, meetupId, studentEmail, studentName);
    logger.info('[POST /api/meetups/:meetupId/signup] Success', {
      userId,
      meetupId,
    });
    res.json({ success: true, message: 'Successfully signed up for meetup' });
  } catch (error: any) {
    logger.error('[POST /api/meetups/:meetupId/signup] Failed', {
      userId,
      meetupId,
      error,
    });

    if (error.message === 'Meetup not found') {
      res.status(404).json({ error: 'Meetup not found' });
    } else {
      res.status(500).json({ error: 'Failed to sign up for meetup' });
    }
  }
});

export default router;
