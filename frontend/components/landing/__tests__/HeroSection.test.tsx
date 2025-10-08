import { render, screen } from '@testing-library/react';
import { HeroSection } from '../HeroSection';
import { mockCourse } from '@/lib/mock-data/course';

// Mock framer motion to avoid async rendering issues in tests
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('HeroSection', () => {
  it('renders course title and subtitle', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.subtitle)).toBeInTheDocument();
  });

  it('renders enroll CTA button', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByRole('link', { name: /enroll now/i })).toBeInTheDocument();
  });

  it('renders course stats', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('Certificates')).toBeInTheDocument();
  });
});
