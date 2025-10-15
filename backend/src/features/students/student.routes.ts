import express from 'express';
import type { Request, Response, Router } from 'express';
import { studentService } from './student.service.js';
import { getUserIdFromContext } from '../../lib/auth-utils.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = express.Router();
const logger = createLogger('StudentRoutes');

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

export default router;
