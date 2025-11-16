import express from 'express';
import type { Request, Response, Router } from 'express';
import { courseService } from './course.service.js';
import { lessonService } from '../lessons/lesson.service.js';
import { getUserIdFromContext } from '../../lib/auth-utils.js';
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

/**
 * GET /api/courses/:courseId/lessons
 * Returns all lessons for a course
 * - Requires authentication
 * - No enrollment check (allows browsing lessons)
 * - Returns lessons without videoKey (security)
 */
router.get('/:courseId/lessons', async (req: Request, res: Response) => {
  const { courseId } = req.params;

  logger.info('[GET /api/courses/:courseId/lessons] Request received', { courseId });

  // Authentication check
  const userId = getUserIdFromContext(req);
  if (!userId) {
    logger.warn('[GET /api/courses/:courseId/lessons] Unauthorized - no userId', { courseId });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Fetch lessons (no enrollment check - allows browsing)
    const lessons = await lessonService.getLessonsByCourse(courseId);
    const totalLessons = lessons.length;

    logger.info('[GET /api/courses/:courseId/lessons] Lessons retrieved', {
      courseId,
      userId,
      totalLessons,
    });

    res.json({
      lessons,
      totalLessons,
    });
  } catch (error) {
    logger.error('[GET /api/courses/:courseId/lessons] Failed to fetch lessons', {
      courseId,
      userId,
      error,
    });
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

export default router;
