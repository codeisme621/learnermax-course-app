import { NotFoundError } from '@/platform/errors';
import * as repo from './courses.repo';
import type { CourseRow } from './courses.repo';
import type { CourseDTO, CourseId } from './courses.types';

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
