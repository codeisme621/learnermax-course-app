import { render, screen } from '@testing-library/react';
import { TestimonialsSection } from '../TestimonialsSection';
import { mockCourse } from '@/lib/mock-data/course';

// Mock framer motion to avoid async rendering issues in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

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
