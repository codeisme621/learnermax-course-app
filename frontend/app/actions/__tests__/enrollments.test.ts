/**
 * Unit tests for enrollments server actions (mutations only)
 * Note: getUserEnrollments and checkEnrollment were moved to lib/data/enrollments.ts
 */
import { enrollInCourse } from '../enrollments';
import * as auth from '../auth';

// Mock the auth module
jest.mock('../auth', () => ({
  getAuthToken: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('enrollments server actions', () => {
  const mockApiUrl = 'http://localhost:8080';
  const mockToken = 'mock-access-token';
  const mockCourseId = 'TEST-COURSE-001';

  beforeEach(() => {
    jest.clearAllMocks();
    // Set API_URL env var
    process.env.NEXT_PUBLIC_API_URL = mockApiUrl;
  });

  describe('enrollInCourse', () => {
    it('successfully enrolls user in course', async () => {
      const mockEnrollment = {
        userId: 'user-123',
        courseId: mockCourseId,
        enrollmentType: 'free' as const,
        enrolledAt: '2025-01-13T12:00:00.000Z',
        paymentStatus: 'free' as const,
        progress: 0,
        completed: false,
      };

      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ enrollment: mockEnrollment, status: 'active' }),
      } as Response);

      const result = await enrollInCourse(mockCourseId);

      expect(auth.getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/enrollments`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          body: JSON.stringify({ courseId: mockCourseId }),
        })
      );
      expect(result).toEqual({
        success: true,
        enrollment: mockEnrollment,
        status: 'active',
      });
    });

    it('returns error when not authenticated', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(null);

      const result = await enrollInCourse(mockCourseId);

      expect(result).toEqual({
        success: false,
        error: 'Not authenticated',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error when API request fails', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Enrollment failed' }),
      } as Response);

      const result = await enrollInCourse(mockCourseId);

      expect(result).toEqual({
        success: false,
        error: 'Enrollment failed',
      });
    });

    it('handles network errors', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await enrollInCourse(mockCourseId);

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });
  });

});
