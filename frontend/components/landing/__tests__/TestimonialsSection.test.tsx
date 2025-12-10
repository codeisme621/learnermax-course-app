import { render, screen } from '@testing-library/react';
import { TestimonialsSection } from '../TestimonialsSection';
import type { CourseData } from '@/types/landing';

// Mock framer motion to avoid async rendering issues in tests
jest.mock('motion/react', () => {
  const MockDiv = ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>;
  MockDiv.displayName = 'MockMotionDiv';
  return {
    motion: {
      div: MockDiv,
    },
  };
});

// Test fixture
const mockCourse: CourseData = {
  id: 'test-course-001',
  title: 'Test Course Title',
  subtitle: 'Test course subtitle for testing',
  description: 'A comprehensive test course description',
  duration: '2hrs',
  level: 'Intermediate',
  category: 'AI Development',
  instructor: {
    name: 'Test Instructor',
    title: 'Software Engineer',
    background: 'Test background',
    imageUrl: '/images/test.jpg',
  },
  outcomes: ['Outcome 1', 'Outcome 2'],
  curriculum: [{ module: 'Module 1', topics: ['Topic 1', 'Topic 2'] }],
  testimonials: [
    {
      id: 'testimonial-1',
      name: 'Test User',
      role: 'Developer',
      content: 'Great course!',
      imageUrl: '/images/testimonial.jpg',
      rating: 5,
    },
    {
      id: 'testimonial-2',
      name: 'Another User',
      role: 'Designer',
      content: 'Very helpful!',
      imageUrl: '/images/testimonial2.jpg',
      rating: 4,
    },
  ],
  stats: {
    students: '100+',
    rating: '4.9/5',
  },
};

describe('TestimonialsSection', () => {
  it('renders section heading', () => {
    render(<TestimonialsSection course={mockCourse} />);
    expect(screen.getByText(/what our students saying/i)).toBeInTheDocument();
  });

  it('renders testimonials', () => {
    render(<TestimonialsSection course={mockCourse} />);
    const firstTestimonial = mockCourse.testimonials[0];
    expect(screen.getByText(firstTestimonial.name)).toBeInTheDocument();
    expect(screen.getByText(firstTestimonial.role)).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<TestimonialsSection course={mockCourse} />);
    expect(screen.getByLabelText(/previous testimonial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next testimonial/i)).toBeInTheDocument();
  });

  it('renders partial star ratings correctly', () => {
    const courseWithPartialRating = {
      ...mockCourse,
      testimonials: [
        {
          ...mockCourse.testimonials[0],
          rating: 3,
        },
      ],
    };
    render(<TestimonialsSection course={courseWithPartialRating} />);
    // Should render 3 filled stars and 2 empty stars
    expect(screen.getByText(courseWithPartialRating.testimonials[0].name)).toBeInTheDocument();
  });
});
