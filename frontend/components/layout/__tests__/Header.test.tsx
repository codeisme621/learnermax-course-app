import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { useRouter } from 'next/navigation';

// Mock framer motion
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Header (Public)', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders logo and navigation buttons', () => {
    render(<Header />);

    expect(screen.getByText('LearnerMax')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Enroll Now')).toBeInTheDocument();
  });

  it('logo links to home page', () => {
    render(<Header />);

    const logo = screen.getByText('LearnerMax').closest('a');
    expect(logo).toHaveAttribute('href', '/');
  });

  it('sign in button links to signin page', () => {
    render(<Header />);

    const signInLink = screen.getByText('Sign In').closest('a');
    expect(signInLink).toHaveAttribute('href', '/signin');
  });

  it('enroll now button stores course ID and navigates', () => {
    render(<Header />);

    const enrollButton = screen.getByText('Enroll Now');
    fireEvent.click(enrollButton);

    expect(sessionStorage.getItem('pendingEnrollmentCourseId')).toBe('TEST-COURSE-001');
    expect(mockPush).toHaveBeenCalledWith('/enroll');
  });
});
