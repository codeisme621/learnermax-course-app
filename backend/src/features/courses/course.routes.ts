import express from 'express';
import type { Request, Response, Router } from 'express';
import { courseService } from './course.service.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = express.Router();
const logger = createLogger('CourseRoutes');

// GET /api/courses - Get all courses
router.get('/', async (req: Request, res: Response) => {
  try {
    const courses = await courseService.getAllCourses();
    res.json(courses);
  } catch (error) {
    logger.error('Failed to get courses', { error });
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// GET /api/courses/:courseId - Get single course
router.get('/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const course = await courseService.getCourse(courseId);

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json(course);
  } catch (error) {
    logger.error('Failed to get course', { error });
    res.status(500).json({ error: 'Failed to get course' });
  }
});

export default router;
