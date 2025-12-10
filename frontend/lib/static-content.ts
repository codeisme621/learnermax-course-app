/**
 * Static content for landing page
 * This content is curated and doesn't come from the database
 */

export interface InstructorProfile {
  name: string;
  title: string;
  background: string;
  imageUrl: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  imageUrl: string;
  rating: number;
}

export interface CourseStats {
  students: string;
  rating: string;
}

/**
 * Instructor profile for Rico Romero
 */
export function getInstructorProfile(): InstructorProfile {
  return {
    name: 'Rico Romero',
    title: 'Software Engineer & Educator',
    background:
      'Experienced software engineer with a passion for teaching developers how to work effectively with AI coding tools. Rico specializes in spec-driven development and context engineering, helping teams build better software through clear specifications and strategic AI collaboration. With years of hands-on experience building full-stack, distributed systems, he brings practical battle-tested patterns and real-world examples to every lesson.',
    imageUrl: '/images/instructor-rico.jpg',
  };
}

/**
 * Curated testimonials for the spec-driven development course
 * Note: These are placeholder testimonials for MVP launch
 * Future: Replace with real student testimonials from database
 */
export function getStaticTestimonials(): Testimonial[] {
  return [
    {
      id: 'testimonial-1',
      name: 'Michael Chen',
      role: 'Software Developer',
      content:
        'This course completely changed how I work with AI coding tools. The spec-driven approach makes everything so much clearer and more efficient. I can now build features faster and with fewer bugs.',
      imageUrl: '/images/testimonials/michael-chen.jpg',
      rating: 5,
    },
    {
      id: 'testimonial-2',
      name: 'Sarah Martinez',
      role: 'Full-Stack Engineer',
      content:
        "Rico's teaching style is exceptional. The examples are practical and immediately applicable to my daily work. Context engineering has become an essential part of my workflow.",
      imageUrl: '/images/testimonials/sarah-martinez.jpg',
      rating: 5,
    },
    {
      id: 'testimonial-3',
      name: 'David Kim',
      role: 'Frontend Developer',
      content:
        "Best investment in my professional development this year. The course is concise, focused, and packed with actionable insights. I've already recommended it to my team.",
      imageUrl: '/images/testimonials/david-kim.jpg',
      rating: 5,
    },
    {
      id: 'testimonial-4',
      name: 'Emily Rodriguez',
      role: 'Product Engineer',
      content:
        'As someone transitioning to AI-assisted development, this course gave me the foundation I needed. Now I feel confident writing specs that get great results from AI tools.',
      imageUrl: '/images/testimonials/emily-rodriguez.jpg',
      rating: 5,
    },
  ];
}

/**
 * Course statistics for landing page
 * Note: These are static values for MVP
 * Future: Calculate from actual enrollment/completion data
 */
export function getCourseStats(): CourseStats {
  return {
    students: '100+',
    rating: '4.9/5',
  };
}

/**
 * Additional helper to get instructor bio paragraph only
 * Used by transformation function
 */
export function getInstructorBio(): string {
  return getInstructorProfile().background;
}

/**
 * Static subtitle for the landing page hero section
 */
export function getStaticSubtitle(): string {
  return 'Turn AI into your superpower: master AI coding with Spec-Driven Development and produce world-class code that sets you apart.';
}

/**
 * Static category for the landing page
 */
export function getStaticCategory(): string {
  return 'AI Development';
}

/**
 * Static learning outcomes for landing page
 */
export function getStaticOutcomes(): string[] {
  return [
    'Why vibe coding feels fast but secretly creates chaos and how spec-driven development fixes it.',
    'How to move from "prompt engineering tricks" to real context engineering that scales to big features and long-running agents.',
    'A practical spec format you can hand to your coding agent of choice and reliably get clean, structured, predictable code back.',
    'How to build a true flywheel: every spec, pattern, and piece of code you create today accelerates all future AI coding tasks — compounding your speed over time.',
    'Concrete patterns, checklists, and workflows for bringing spec-driven development into your real projects without rewriting everything.',
  ];
}

/**
 * Static duration for landing page
 */
export function getStaticDuration(): string {
  return '2hrs';
}

/**
 * Static level for landing page
 */
export function getStaticLevel(): string {
  return 'Intermediate';
}
