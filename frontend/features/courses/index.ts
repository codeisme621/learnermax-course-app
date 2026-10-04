export { listCourses, getCourse, listLessons } from './courses.service';
export type { CourseDTO, CourseId, LessonDTO, LessonId, LessonsDTO } from './courses.types';

// The one course on sale. Landing page CTAs and checkout default to it.
export const AGENTIC_CODING_COURSE_ID = 'agentic-coding';
