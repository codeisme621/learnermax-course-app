import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackModal } from '../FeedbackModal';

// Mock the submitFeedback action
jest.mock('@/app/actions/feedback', () => ({
  submitFeedback: jest.fn(),
}));

import { submitFeedback } from '@/app/actions/feedback';

const mockSubmitFeedback = submitFeedback as jest.MockedFunction<typeof submitFeedback>;

describe('FeedbackModal', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubmitFeedback.mockResolvedValue({ feedbackId: 'feedback-123' });
  });

  it('renders modal with category select, textarea and submit button when open', () => {
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    expect(screen.getByText('Send Feedback')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Your Feedback')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows rating stars when General Feedback category is selected (default)', () => {
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    // General Feedback is the default category
    expect(screen.getByText('Rating')).toBeInTheDocument();
    // Should have 5 star buttons
    const starButtons = screen.getAllByRole('button', { name: /rate \d out of 5 stars/i });
    expect(starButtons).toHaveLength(5);
  });

  it('submits general feedback with rating successfully', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    const textarea = screen.getByLabelText('Your Feedback');

    // Enter feedback
    await user.type(textarea, 'This is great feedback!');

    // Click a star to rate
    const star4 = screen.getByRole('button', { name: 'Rate 4 out of 5 stars' });
    await user.click(star4);

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith({
        feedback: 'This is great feedback!',
        category: 'general',
        rating: 4,
      });
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    });
  });

  it('shows validation error when submitting empty feedback', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    // Click a star to satisfy rating requirement
    const star5 = screen.getByRole('button', { name: 'Rate 5 out of 5 stars' });
    await user.click(star5);

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    expect(screen.getByText('Please enter your feedback')).toBeInTheDocument();
    expect(mockSubmitFeedback).not.toHaveBeenCalled();
  });

  it('shows validation error when general feedback has no rating', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    // Enter feedback but don't select rating
    const textarea = screen.getByLabelText('Your Feedback');
    await user.type(textarea, 'Great app!');

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    expect(screen.getByText('Please provide a rating')).toBeInTheDocument();
    expect(mockSubmitFeedback).not.toHaveBeenCalled();
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    // Make the mock hang to simulate loading
    mockSubmitFeedback.mockImplementation(() => new Promise(() => {}));

    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    const textarea = screen.getByLabelText('Your Feedback');
    await user.type(textarea, 'Test feedback');

    const star5 = screen.getByRole('button', { name: 'Rate 5 out of 5 stars' });
    await user.click(star5);

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
    });
  });

  it('shows error when API returns error', async () => {
    const user = userEvent.setup();
    mockSubmitFeedback.mockResolvedValue({ error: 'Please sign in to submit feedback' });

    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    const textarea = screen.getByLabelText('Your Feedback');
    await user.type(textarea, 'Test feedback');

    const star5 = screen.getByRole('button', { name: 'Rate 5 out of 5 stars' });
    await user.click(star5);

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please sign in to submit feedback')).toBeInTheDocument();
    });
  });

  it('clears error when user starts typing after validation error', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    // Click a star first
    const star5 = screen.getByRole('button', { name: 'Rate 5 out of 5 stars' });
    await user.click(star5);

    // Try to submit empty feedback
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);
    expect(screen.getByText('Please enter your feedback')).toBeInTheDocument();

    // Start typing
    const textarea = screen.getByLabelText('Your Feedback');
    await user.type(textarea, 'New feedback');

    // Error should be cleared
    expect(screen.queryByText('Please enter your feedback')).not.toBeInTheDocument();
  });

  it('allows clicking different star ratings', async () => {
    const user = userEvent.setup();
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    // Click each star and verify it can be clicked
    for (let i = 1; i <= 5; i++) {
      const star = screen.getByRole('button', { name: `Rate ${i} out of 5 stars` });
      await user.click(star);
    }

    // Final click should be on star 5
    const textarea = screen.getByLabelText('Your Feedback');
    await user.type(textarea, 'Testing stars');

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith({
        feedback: 'Testing stars',
        category: 'general',
        rating: 5,
      });
    });
  });

  it('displays category dropdown with correct default value', () => {
    render(<FeedbackModal open={true} onOpenChange={mockOnOpenChange} userId="user-123" />);

    // The combobox should show "General Feedback" as default
    const combobox = screen.getByRole('combobox');
    expect(combobox).toHaveTextContent('General Feedback');
  });
});
