// REST contract for GET /api/progress/:courseId and POST /api/progress (shape kept from the Express API).
export interface ProgressDTO {
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;
  totalLessons: number;
  updatedAt: string;
}
