import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackModal } from '../FeedbackModal';

describe('FeedbackModal', () => {
  const mockOnOpenChange = jest.fn();
  const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('renders modal with textarea and submit button when open', () => {
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    expect(screen.getByText('Send Feedback')).toBeInTheDocument();
    expect(screen.getByLabelText('Your Feedback')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('submits valid feedback and logs to console', async () => {
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    const textarea = screen.getByLabelText('Your Feedback');
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });

    // Enter feedback
    fireEvent.change(textarea, { target: { value: 'This is great feedback!' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Feedback submitted:',
        expect.objectContaining({
          userId: 'user-123',
          feedback: 'This is great feedback!',
          timestamp: expect.any(String),
        })
      );
    });

    // Modal should close
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows validation error when submitting empty feedback', () => {
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    fireEvent.click(submitButton);

    expect(screen.getByText('Please enter your feedback')).toBeInTheDocument();
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it('closes modal when cancel button is clicked', () => {
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('clears error when user starts typing after validation error', () => {
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    const textarea = screen.getByLabelText('Your Feedback');

    // Trigger validation error
    fireEvent.click(submitButton);
    expect(screen.getByText('Please enter your feedback')).toBeInTheDocument();

    // Start typing
    fireEvent.change(textarea, { target: { value: 'New feedback' } });

    // Error should be cleared
    expect(screen.queryByText('Please enter your feedback')).not.toBeInTheDocument();
  });
});
