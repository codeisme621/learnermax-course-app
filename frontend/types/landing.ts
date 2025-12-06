/**
 * Landing page course data structure
 * Transformed from backend Course type with static content
 */
export interface CourseData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  level: string;
  category: string;
  instructor: {
    name: string;
    title: string;
    background: string;
    imageUrl: string;
  };
  outcomes: string[];
  curriculum: {
    module: string;
    topics: string[];
  }[];
  testimonials: {
    id: string;
    name: string;
    role: string;
    content: string;
    imageUrl: string;
    rating: number;
  }[];
  stats: {
    students: string;
    rating: string;
  };
}
