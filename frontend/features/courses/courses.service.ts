import { NotFoundError } from '@/platform/errors';
import * as repo from './courses.repo';
import type { CourseRow } from './courses.repo';
import type { CourseDTO, CourseId, CourseOffer, LessonDTO, LessonsDTO } from './courses.types';

function toDTO(row: CourseRow, totalLessons: number): CourseDTO {
  return {
    courseId: row.id,
    name: row.name,
    description: row.description,
    instructor: row.instructor,
    pricingModel: 'paid',
    price: row.priceCents / 100,
    imageUrl: row.imageUrl,
    learningObjectives: row.learningObjectives,
    curriculum: [],
    comingSoon: row.comingSoon,
    ...(row.estimatedDuration ? { estimatedDuration: row.estimatedDuration } : {}),
    totalLessons,
  };
}

export async function listCourses(): Promise<CourseDTO[]> {
  const [rows, lessonCounts] = await Promise.all([repo.findAllCourses(), repo.countLessonsByCourse()]);
  return rows.map((row) => toDTO(row, lessonCounts.get(row.id) ?? 0));
}

export async function getCourse(courseId: CourseId): Promise<CourseDTO> {
  const row = await repo.findCourse(courseId);
  if (!row) {
    throw new NotFoundError('Course not found');
  }
  const lessonCounts = await repo.countLessonsByCourse();
  return toDTO(row, lessonCounts.get(row.id) ?? 0);
}

/** Lessons of a course in order. Callers must check course access first. */
export async function listLessons(courseId: CourseId): Promise<LessonsDTO> {
  const rows = await repo.findLessons(courseId);
  const lessons: LessonDTO[] = rows.map((row) => ({
    lessonId: row.lessonId,
    courseId: row.courseId,
    title: row.title,
    ...(row.description ? { description: row.description } : {}),
    ...(row.lengthInMins !== null ? { lengthInMins: row.lengthInMins } : {}),
    order: row.order,
  }));
  return { lessons, totalLessons: lessons.length };
}

export function stripePriceLookupKey(row: { id: string; currency: string; priceCents: number }): string {
  return `${row.id}-${row.currency}-${row.priceCents}`;
}

export async function getOffer(courseId: CourseId): Promise<CourseOffer> {
  const row = await repo.findCourse(courseId);
  if (!row || row.comingSoon) {
    throw new NotFoundError('Course not found');
  }
  return {
    courseId: row.id,
    amountCents: row.priceCents,
    currency: row.currency,
    stripePriceLookupKey: stripePriceLookupKey(row),
  };
}
