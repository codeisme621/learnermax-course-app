/**
 * Unit tests for meetups server actions (mutations only)
 * Note: getMeetups was moved to lib/data/meetups.ts
 */
import { signupForMeetup } from '../meetups';
import * as auth from '../auth';

// Mock the auth module
jest.mock('../auth', () => ({
  getAuthToken: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('meetups server actions', () => {
  const mockApiUrl = 'http://localhost:8080';
  const mockToken = 'mock-jwt-token';
  const mockMeetupId = 'spec-driven-dev-weekly';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = mockApiUrl;
  });

  describe('signupForMeetup', () => {
    it('signupForMeetup_success_completes', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await signupForMeetup(mockMeetupId);

      expect(auth.getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/meetups/${mockMeetupId}/signup`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
        })
      );

      expect(result).toBeUndefined(); // Success returns void
    });

    it('signupForMeetup_noAuth_returnsError', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(null);

      const result = await signupForMeetup(mockMeetupId);

      expect(result).toEqual({
        error: 'Authentication required',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('signupForMeetup_apiError_returnsError', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({ error: 'Failed to save signup' }),
      } as Response);

      const result = await signupForMeetup(mockMeetupId);

      expect(result).toEqual({
        error: 'Failed to sign up. Please try again.',
      });
    });

    it('signupForMeetup_404NotFound_returnsError', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: 'Meetup not found' }),
      } as Response);

      const result = await signupForMeetup(mockMeetupId);

      expect(result).toEqual({
        error: 'Meetup not found',
      });
    });

    it('signupForMeetup_409AlreadySignedUp_treatsAsSuccess', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        text: async () => JSON.stringify({ error: 'Already signed up' }),
      } as Response);

      const result = await signupForMeetup(mockMeetupId);

      // 409 should be treated as idempotent success
      expect(result).toBeUndefined();
    });

    it('signupForMeetup_networkError_returnsError', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      const result = await signupForMeetup(mockMeetupId);

      expect(result).toEqual({
        error: 'Unable to connect to server. Please check your internet connection.',
      });
    });
  });
});
