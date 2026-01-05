import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeetupCard } from '../MeetupCard';
import type { MeetupData } from '@/lib/data/meetups';

// Mock the useStudent hook
const mockSignupForMeetup = jest.fn();
let mockSignedUpMeetups: string[] = [];

jest.mock('@/hooks/useStudent', () => ({
  useStudent: () => ({
    signedUpMeetups: mockSignedUpMeetups,
    signupForMeetup: mockSignupForMeetup,
  }),
}));

describe('MeetupCard', () => {
  const mockMeetup: MeetupData = {
    meetupId: 'spec-driven-dev-weekly',
    title: 'Spec Driven Development',
    description: 'Weekly discussion on spec-driven workflows, best practices, and Q&A',
    nextOccurrence: '2025-01-25T16:00:00.000Z', // Saturday 10 AM CST
    isRunning: false,
    duration: 60,
    hostName: 'Rico Martinez',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignedUpMeetups = [];
  });

  describe('MeetupCard_notSignedUp_showsSignupButton', () => {
    it('renders meetup information correctly', () => {
      render(<MeetupCard meetup={mockMeetup} />);

      expect(screen.getByText('Spec Driven Development')).toBeInTheDocument();
      expect(screen.getByText(/Weekly discussion on spec-driven workflows/)).toBeInTheDocument();
      expect(screen.getByText('Rico Martinez')).toBeInTheDocument();
      expect(screen.getByText('60 min')).toBeInTheDocument();
    });

    it('displays Sign Up button when not signed up', () => {
      render(<MeetupCard meetup={mockMeetup} />);

      expect(screen.getByRole('button', { name: /Sign Up for Meetup/i })).toBeInTheDocument();
      expect(screen.queryByText('✓ Registered')).not.toBeInTheDocument();
    });

    it('does not show LIVE badge when not running', () => {
      render(<MeetupCard meetup={mockMeetup} />);

      expect(screen.queryByText(/LIVE/)).not.toBeInTheDocument();
    });
  });

  describe('MeetupCard_signedUpNotRunning_showsRegisteredBadge', () => {
    it('displays Registered badge when signed up', () => {
      mockSignedUpMeetups = ['spec-driven-dev-weekly'];
      render(<MeetupCard meetup={mockMeetup} />);

      expect(screen.getByText('✓ Registered')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sign Up for Meetup/i })).not.toBeInTheDocument();
    });

    it('displays confirmation message with calendar mention', () => {
      mockSignedUpMeetups = ['spec-driven-dev-weekly'];
      render(<MeetupCard meetup={mockMeetup} />);

      expect(screen.getByText(/Calendar invite sent to your email/)).toBeInTheDocument();
    });
  });

  describe('MeetupCard_signedUpAndRunning_showsJoinZoomButton', () => {
    it('displays LIVE badge when meeting is running', () => {
      mockSignedUpMeetups = ['spec-driven-dev-weekly'];
      const runningMeetup: MeetupData = {
        ...mockMeetup,
        isRunning: true,
        zoomLink: 'https://zoom.us/j/123456789',
      };

      render(<MeetupCard meetup={runningMeetup} />);

      expect(screen.getByText(/LIVE/)).toBeInTheDocument();
    });

    it('displays Join Live Now button when running and signed up', () => {
      mockSignedUpMeetups = ['spec-driven-dev-weekly'];
      const runningMeetup: MeetupData = {
        ...mockMeetup,
        isRunning: true,
        zoomLink: 'https://zoom.us/j/123456789',
      };

      render(<MeetupCard meetup={runningMeetup} />);

      expect(screen.getByRole('button', { name: /Join Live Now/i })).toBeInTheDocument();
      expect(screen.queryByText(/Calendar invite sent/)).not.toBeInTheDocument();
    });

    it('does not show Join Live Now button if not signed up', () => {
      const runningMeetup: MeetupData = {
        ...mockMeetup,
        isRunning: true,
      };

      render(<MeetupCard meetup={runningMeetup} />);

      expect(screen.queryByRole('button', { name: /Join Live Now/i })).not.toBeInTheDocument();
    });
  });

  describe('MeetupCard_clickSignup_callsSignupAction', () => {
    it('calls signupForMeetup when Sign Up button is clicked', async () => {
      const user = userEvent.setup();
      mockSignupForMeetup.mockResolvedValue({}); // Success

      render(<MeetupCard meetup={mockMeetup} />);

      const signupButton = screen.getByRole('button', { name: /Sign Up for Meetup/i });
      await user.click(signupButton);

      expect(mockSignupForMeetup).toHaveBeenCalledWith('spec-driven-dev-weekly');
    });

    it('shows loading state during signup', async () => {
      const user = userEvent.setup();

      // Make signup take some time
      mockSignupForMeetup.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({}), 100)));

      render(<MeetupCard meetup={mockMeetup} />);

      const signupButton = screen.getByRole('button', { name: /Sign Up for Meetup/i });
      await user.click(signupButton);

      // Check for loading text
      expect(screen.getByText('Signing up...')).toBeInTheDocument();

      // Wait for signup to complete
      await waitFor(() => {
        expect(screen.queryByText('Signing up...')).not.toBeInTheDocument();
      });
    });

    it('displays error message if signup fails', async () => {
      const user = userEvent.setup();
      mockSignupForMeetup.mockResolvedValue({ error: 'Failed to sign up. Please try again.' });

      render(<MeetupCard meetup={mockMeetup} />);

      const signupButton = screen.getByRole('button', { name: /Sign Up for Meetup/i });
      await user.click(signupButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to sign up. Please try again.')).toBeInTheDocument();
      });

      // Button should still be visible for retry
      expect(screen.getByRole('button', { name: /Sign Up for Meetup/i })).toBeInTheDocument();
    });
  });

  describe('MeetupCard_clickJoinLive_opensNewTab', () => {
    it('opens Zoom link in new tab when Join Live Now button is clicked', async () => {
      mockSignedUpMeetups = ['spec-driven-dev-weekly'];
      const user = userEvent.setup();
      const mockWindowOpen = jest.spyOn(window, 'open').mockImplementation();

      const runningMeetup: MeetupData = {
        ...mockMeetup,
        isRunning: true,
        zoomLink: 'https://zoom.us/j/123456789',
      };

      render(<MeetupCard meetup={runningMeetup} />);

      const joinButton = screen.getByRole('button', { name: /Join Live Now/i });
      await user.click(joinButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://zoom.us/j/123456789',
        '_blank',
        'noopener,noreferrer'
      );

      mockWindowOpen.mockRestore();
    });

    it('does not open window if zoomLink is missing', async () => {
      mockSignedUpMeetups = ['spec-driven-dev-weekly'];
      const mockWindowOpen = jest.spyOn(window, 'open').mockImplementation();

      const runningMeetupNoLink: MeetupData = {
        ...mockMeetup,
        isRunning: true,
        // zoomLink intentionally omitted
      };

      render(<MeetupCard meetup={runningMeetupNoLink} />);

      // Button should not be rendered without zoomLink
      expect(screen.queryByRole('button', { name: /Join Live Now/i })).not.toBeInTheDocument();
      expect(mockWindowOpen).not.toHaveBeenCalled();

      mockWindowOpen.mockRestore();
    });
  });
});
