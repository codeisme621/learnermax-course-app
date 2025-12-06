/**
 * Integration tests for AuthenticatedHeader component in course context
 * Tests course-specific header features: progress display, responsive behavior
 */
import { render, screen } from '@testing-library/react';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';

// Mock framer motion
jest.mock('motion/react', () => ({
  motion: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
  },
}));

// Mock auth action
jest.mock('@/app/actions/auth', () => ({
  signOutAction: jest.fn(),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('Course AuthenticatedHeader Integration Tests', () => {
  const mockUser = {
    id: 'user-456',
    name: 'Alex Johnson',
    email: 'alex@example.com',
  };

  const mockCourseProgress = {
    percentage: 75,
    completedLessons: 6,
    totalLessons: 8,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders course header with progress bar on desktop', () => {
    render(
      <AuthenticatedHeader
        variant="course"
        user={mockUser}
        courseProgress={mockCourseProgress}
      />
    );

    // Progress text should be visible (on desktop)
    expect(screen.getByText('6 of 8 lessons • 75%')).toBeInTheDocument();
  });

  it('hides progress text on mobile but shows bar', () => {
    render(
      <AuthenticatedHeader
        variant="course"
        user={mockUser}
        courseProgress={mockCourseProgress}
      />
    );

    // Desktop progress text should have hidden md:block classes
    const desktopProgress = screen.getByText('6 of 8 lessons • 75%');
    expect(desktopProgress).toHaveClass('hidden');
    expect(desktopProgress).toHaveClass('md:block');

    // Mobile progress text (percentage only) should have md:hidden class
    const mobileProgress = screen.getByText('75%');
    expect(mobileProgress).toHaveClass('md:hidden');
  });

  it('updates progress when lesson is completed', () => {
    const { rerender } = render(
      <AuthenticatedHeader
        variant="course"
        user={mockUser}
        courseProgress={mockCourseProgress}
      />
    );

    // Initial progress
    expect(screen.getByText('6 of 8 lessons • 75%')).toBeInTheDocument();

    // Simulate progress update (lesson completed)
    const updatedProgress = {
      percentage: 88,
      completedLessons: 7,
      totalLessons: 8,
    };

    rerender(
      <AuthenticatedHeader
        variant="course"
        user={mockUser}
        courseProgress={updatedProgress}
      />
    );

    // Updated progress should be displayed
    expect(screen.getByText('7 of 8 lessons • 88%')).toBeInTheDocument();
  });

  it('handles missing progress data gracefully', () => {
    render(<AuthenticatedHeader variant="course" user={mockUser} />);

    // Should not crash, header should still render
    expect(screen.getByText('LearnWithRico')).toBeInTheDocument();

    // Progress should not be shown
    expect(screen.queryByText(/lessons/i)).not.toBeInTheDocument();
  });

  it('maintains all header features (feedback, profile) in course variant', () => {
    render(
      <AuthenticatedHeader
        variant="course"
        user={mockUser}
        courseProgress={mockCourseProgress}
      />
    );

    // Logo
    expect(screen.getByText('LearnWithRico')).toBeInTheDocument();

    // Feedback button
    expect(screen.getByLabelText('Feedback')).toBeInTheDocument();

    // Avatar
    expect(screen.getByText('AJ')).toBeInTheDocument();
  });
});
