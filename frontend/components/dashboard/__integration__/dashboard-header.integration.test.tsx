import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthenticatedHeader } from '@/components/layout/AuthenticatedHeader';
import { signOutAction } from '@/app/actions/auth';

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
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Dashboard Header Integration', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
  };

  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('renders authenticated header with profile dropdown on dashboard', () => {
    render(<AuthenticatedHeader variant="dashboard" user={mockUser} />);

    // Header should be visible
    expect(screen.getByText('LearnerMax')).toBeInTheDocument();

    // Feedback button should be visible
    expect(screen.getByLabelText('Feedback')).toBeInTheDocument();

    // Avatar should show initials
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders profile dropdown trigger with correct user initials', () => {
    render(<AuthenticatedHeader variant="dashboard" user={mockUser} />);

    // Avatar should show user initials (Jane Smith = JS)
    const avatar = screen.getByText('JS');
    expect(avatar).toBeInTheDocument();

    // Dropdown trigger button should exist
    const dropdownTrigger = screen.getByRole('button', { expanded: false });
    expect(dropdownTrigger).toBeInTheDocument();
  });

  it('opens feedback modal when feedback button is clicked', async () => {
    render(<AuthenticatedHeader variant="dashboard" user={mockUser} />);

    const feedbackButton = screen.getByLabelText('Feedback');
    fireEvent.click(feedbackButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Send Feedback')).toBeInTheDocument();
      expect(screen.getByLabelText('Your Feedback')).toBeInTheDocument();
    });

    // Console log should be called
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'User opened feedback modal',
      expect.objectContaining({
        userId: 'user-123',
      })
    );
  });

  it('submits feedback and logs to console', async () => {
    render(<AuthenticatedHeader variant="dashboard" user={mockUser} />);

    // Open feedback modal
    const feedbackButton = screen.getByLabelText('Feedback');
    fireEvent.click(feedbackButton);

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText('Send Feedback')).toBeInTheDocument();
    });

    // Enter feedback
    const textarea = screen.getByLabelText('Your Feedback');
    fireEvent.change(textarea, { target: { value: 'Great dashboard!' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);

    // Verify feedback logged
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Feedback submitted:',
        expect.objectContaining({
          userId: 'user-123',
          feedback: 'Great dashboard!',
        })
      );
    });
  });
});
