// Cached data functions (use 'use cache' directive)
export { getAllCourses, getCourse } from './courses';
export type { Course, CourseModule } from './courses';

export { getLessons, getVideoUrl } from './lessons';
export type { Lesson, LessonResponse, VideoUrlResponse } from './lessons';

export { getMeetups } from './meetups';
export type { MeetupData } from './meetups';

// Not cached but needed to run on server side to check enrollment
export { checkEnrollment } from './enrollments';
export type { Enrollment, EnrollmentResult } from './enrollments';

// Note: Progress is fetched exclusively via SWR hooks (useProgress)
// No server-side getProgress function - progress is user-specific and dynamic
