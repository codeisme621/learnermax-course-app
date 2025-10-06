import { render, screen } from '@testing-library/react';
import { CourseMetadataSection } from '../CourseMetadataSection';
import { mockCourse } from '@/lib/mock-data/course';

// Mock framer motion to avoid async rendering issues in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  },
}));

describe('CourseMetadataSection', () => {
  it('renders instructor information', () => {
    render(<CourseMetadataSection course={mockCourse} />);
    expect(screen.getByText(mockCourse.instructor.name)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.instructor.title)).toBeInTheDocument();
  });

  it('renders course details', () => {
    render(<CourseMetadataSection course={mockCourse} />);
    expect(screen.getByText(/duration:/i)).toBeInTheDocument();
    expect(screen.getByText(/level:/i)).toBeInTheDocument();
  });

  it('renders learning outcomes', () => {
    render(<CourseMetadataSection course={mockCourse} />);
    expect(screen.getByText(/what you'll learn/i)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.outcomes[0])).toBeInTheDocument();
  });
});
