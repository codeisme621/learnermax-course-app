import { render, screen } from '@testing-library/react';
import { Header } from '../Header';

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
    header: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <header {...props}>{children}</header>,
  },
}));

describe('Header', () => {
  beforeEach(() => {
    mockPush.mockClear();
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  it('renders logo', () => {
    render(<Header />);
    expect(screen.getByText('LearnerMax')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enroll now/i })).toBeInTheDocument();
  });

  it('stores TEST-COURSE-001 in sessionStorage and navigates when Enroll Now clicked', () => {
    render(<Header />);
    const enrollButton = screen.getByRole('button', { name: /enroll now/i });

    enrollButton.click();

    expect(sessionStorage.getItem('pendingEnrollmentCourseId')).toBe('TEST-COURSE-001');
    expect(mockPush).toHaveBeenCalledWith('/enroll');
  });
});
