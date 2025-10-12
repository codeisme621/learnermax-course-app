export interface CourseVideo {
  videoId: string;
  title: string;
  lengthInMins: number;
  videoPath: string; // S3 path or CDN URL for video player
}

export interface CourseModule {
  moduleId: string;
  moduleName: string;
  videos: CourseVideo[];
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
