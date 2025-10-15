import { render, screen } from '@testing-library/react';
import { HeroSection } from '../HeroSection';
import { mockCourse } from '@/lib/mock-data/course';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock framer motion to avoid async rendering issues in tests
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('HeroSection', () => {
  beforeEach(() => {
    mockPush.mockClear();
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  it('renders course title and subtitle', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByText(mockCourse.title)).toBeInTheDocument();
    expect(screen.getByText(mockCourse.subtitle)).toBeInTheDocument();
  });

  it('renders enroll CTA button', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByRole('button', { name: /enroll now/i })).toBeInTheDocument();
  });

  it('stores courseId in sessionStorage and navigates when enroll button clicked', () => {
    render(<HeroSection course={mockCourse} />);
    const enrollButton = screen.getByRole('button', { name: /enroll now/i });

    enrollButton.click();

    expect(sessionStorage.getItem('pendingEnrollmentCourseId')).toBe(mockCourse.id);
    expect(mockPush).toHaveBeenCalledWith('/enroll');
  });

  it('renders course stats', () => {
    render(<HeroSection course={mockCourse} />);
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('Certificates')).toBeInTheDocument();
  });
});
