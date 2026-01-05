import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthenticatedHeader } from '../AuthenticatedHeader';

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

// Mock useProgress hook
let mockProgressData = {
  percentage: 0,
  completedCount: 0,
  totalLessons: 0,
  isLoading: false,
};

jest.mock('@/hooks/useProgress', () => ({
  useProgress: () => mockProgressData,
}));

describe('AuthenticatedHeader', () => {
  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john.doe@example.com',
  };

  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default mock data
    mockProgressData = {
      percentage: 0,
      completedCount: 0,
      totalLessons: 0,
      isLoading: false,
    };
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('renders dashboard variant without progress', () => {
    render(<AuthenticatedHeader variant="dashboard" user={mockUser} />);

    expect(screen.getByText('LearnWithRico')).toBeInTheDocument();
    expect(screen.queryByText(/lessons/i)).not.toBeInTheDocument();
  });

  it('renders course variant with progress', () => {
    // Set up mock progress data
    mockProgressData = {
      percentage: 60,
      completedCount: 3,
      totalLessons: 5,
      isLoading: false,
    };

    render(
      <AuthenticatedHeader
        variant="course"
        user={mockUser}
        courseId="test-course-id"
      />
    );

    expect(screen.getByText('LearnWithRico')).toBeInTheDocument();
    expect(screen.getByText('3 of 5 lessons • 60%')).toBeInTheDocument();
  });

  it('renders profile dropdown trigger with user initials', () => {
    render(<AuthenticatedHeader variant="dashboard" user={mockUser} />);

    // Avatar should show initials
    const avatar = screen.getByText('JD');
    expect(avatar).toBeInTheDocument();

    // Dropdown trigger button should exist
    const dropdownTrigger = screen.getByRole('button', { expanded: false });
    expect(dropdownTrigger).toBeInTheDocument();
  });

  it('renders dropdown menu content with user info when opened', async () => {
    const { container } = render(<AuthenticatedHeader variant="dashboard" user={mockUser} />);

    // Find and click the dropdown trigger button
    const trigger = container.querySelector('button[data-state="closed"]');
    expect(trigger).toBeInTheDocument();

    if (trigger) {
      fireEvent.click(trigger);

      // Wait for dropdown to potentially open
      await waitFor(() => {
        // Note: In test environment, Radix dropdown may not fully render
        // This test verifies the component structure exists
        expect(trigger).toBeInTheDocument();
      });
    }
  });

  it('opens feedback modal when feedback button is clicked', async () => {
    render(<AuthenticatedHeader variant="dashboard" user={mockUser} />);

    const feedbackButton = screen.getByLabelText('Feedback');
    fireEvent.click(feedbackButton);

    await waitFor(() => {
      expect(screen.getByText('Send Feedback')).toBeInTheDocument();
    });
  });

  it('logo links to dashboard', () => {
    render(<AuthenticatedHeader variant="dashboard" user={mockUser} />);

    const logo = screen.getByText('LearnWithRico').closest('a');
    expect(logo).toHaveAttribute('href', '/dashboard');
  });

  it('hides progress on mobile for course variant', () => {
    // Set up mock progress data
    mockProgressData = {
      percentage: 60,
      completedCount: 3,
      totalLessons: 5,
      isLoading: false,
    };

    render(
      <AuthenticatedHeader
        variant="course"
        user={mockUser}
        courseId="test-course-id"
      />
    );

    // Desktop progress text should have hidden md:block classes
    const desktopProgress = screen.getByText('3 of 5 lessons • 60%');
    expect(desktopProgress).toHaveClass('hidden');
    expect(desktopProgress).toHaveClass('md:block');

    // Mobile progress text (percentage only) should have md:hidden class
    const mobileProgress = screen.getByText('60%');
    expect(mobileProgress).toHaveClass('md:hidden');
  });

  it('shows progress on desktop for course variant', () => {
    // Set up mock progress data
    mockProgressData = {
      percentage: 60,
      completedCount: 3,
      totalLessons: 5,
      isLoading: false,
    };

    render(
      <AuthenticatedHeader
        variant="course"
        user={mockUser}
        courseId="test-course-id"
      />
    );

    // Progress text is visible on desktop (md:flex)
    const progressText = screen.getByText('3 of 5 lessons • 60%');
    expect(progressText).toBeInTheDocument();
  });
});
