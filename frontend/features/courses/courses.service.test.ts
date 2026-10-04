import { describe, expect, it } from 'vitest';
import { NotFoundError } from '@/platform/errors';
import { AGENTIC_CODING_COURSE_ID, getCourse, listCourses } from '@/features/courses';

describe('courses service (real Postgres)', () => {
  it('returns the seeded course in the preserved REST contract shape', async () => {
    const course = await getCourse(AGENTIC_CODING_COURSE_ID);

    expect(course).toEqual({
      courseId: 'agentic-coding',
      name: 'Agentic Coding',
      description: expect.any(String),
      instructor: 'Rico Romero',
      pricingModel: 'paid',
      price: 399,
      imageUrl: '/images/instructor-rico.jpg',
      learningObjectives: expect.arrayContaining(['Context engineering', 'Harness engineering']),
      curriculum: [],
      comingSoon: false,
      totalLessons: 0,
    });
    expect(course.learningObjectives).toHaveLength(12);
  });

  it('lists the seeded course first (other test files add throwaway courses to the shared test DB)', async () => {
    const courses = await listCourses();
    expect(courses[0]).toEqual(await getCourse(AGENTIC_CODING_COURSE_ID));
  });

  it('throws NotFoundError for an unknown course', async () => {
    await expect(getCourse('does-not-exist')).rejects.toBeInstanceOf(NotFoundError);
  });
});
