export type CourseId = string;

// REST contract for GET /api/courses and GET /api/courses/:courseId.
// Shape kept from the Express API; every course is paid now.
export interface CourseDTO {
  courseId: CourseId;
  name: string;
  description: string;
  instructor: string;
  pricingModel: 'paid';
  price: number; // whole dollars, display only — charging uses getOffer()
  imageUrl: string;
  learningObjectives: string[];
  curriculum: [];
  comingSoon: boolean;
  estimatedDuration?: string;
  totalLessons: number;
}
