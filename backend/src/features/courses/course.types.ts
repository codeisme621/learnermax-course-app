export interface Lesson {
  lessonId: string;        // Renamed from videoId
  title: string;
  lengthInMins: number;
  videoKey: string;        // Renamed from videoPath - S3 object key (e.g., "courses/spec-driven-dev-mini/lesson-1.mp4")
}

export interface CourseModule {
  moduleId: string;
  moduleName: string;
  lessons: Lesson[];       // Renamed from videos
}

export interface Course {
  courseId: string;
  name: string;
  description: string;
  instructor: string;
  pricingModel: 'free' | 'paid';
  price?: number;
  imageUrl: string;
  learningObjectives: string[];
  curriculum: CourseModule[];
}
