import express from 'express';
import type { Request, Response, Router } from 'express';
import { courseService } from './course.service.js';
import { createLogger } from '../../lib/logger.js';

const router: Router = express.Router();
const logger = createLogger('CourseRoutes');

// GET /api/courses - Get all courses
router.get('/', async (req: Request, res: Response) => {
  logger.info('[GET /api/courses] Request received');

  try {
    const courses = await courseService.getAllCourses();
    logger.info('[GET /api/courses] Successfully fetched courses', {
      count: courses.length,
      courseIds: courses.map(c => c.courseId)
    });
    res.json(courses);
  } catch (error) {
    logger.error('[GET /api/courses] Failed to get courses', { error });
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// GET /api/courses/:courseId - Get single course
router.get('/:courseId', async (req: Request, res: Response) => {
  const { courseId } = req.params;
  logger.info('[GET /api/courses/:courseId] Request received', { courseId });

  try {
    const course = await courseService.getCourse(courseId);

    if (!course) {
      logger.warn('[GET /api/courses/:courseId] Course not found', { courseId });
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    logger.info('[GET /api/courses/:courseId] Successfully fetched course', { courseId });
    res.json(course);
  } catch (error) {
    logger.error('[GET /api/courses/:courseId] Failed to get course', { courseId, error });
    res.status(500).json({ error: 'Failed to get course' });
  }
});

export default router;
