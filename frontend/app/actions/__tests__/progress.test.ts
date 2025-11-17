/**
 * Unit tests for progress server actions
 * Following existing test pattern with jest.fn() mocking
 */
import { getProgress, markLessonComplete } from '../progress';
import * as auth from '../auth';

// Mock the auth module
jest.mock('../auth', () => ({
  getAuthToken: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('progress server actions', () => {
  const mockApiUrl = 'http://localhost:8080';
  const mockToken = 'mock-jwt-token';
  const mockCourseId = 'spec-driven-dev-mini';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = mockApiUrl;
  });

  describe('getProgress', () => {
    it('successfully fetches student progress', async () => {
      const mockProgress = {
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 67,
        totalLessons: 3,
        updatedAt: new Date().toISOString(),
      };

      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProgress,
      } as Response);

      const result = await getProgress(mockCourseId);

      expect(auth.getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/progress/${mockCourseId}`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          cache: 'no-store',
        })
      );

      expect(result).toEqual(mockProgress);
    });

    it('returns error when not authenticated', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(null);

      const result = await getProgress(mockCourseId);

      expect(result).toEqual({
        error: 'Authentication required',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error for 404 course not found', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: 'Course not found' }),
      } as Response);

      const result = await getProgress(mockCourseId);

      expect(result).toEqual({
        error: 'Course not found',
      });
    });

    it('handles network errors', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await getProgress(mockCourseId);

      expect(result).toEqual({
        error: 'Failed to connect to backend. Please check if backend is running.',
      });
    });
  });

  describe('markLessonComplete', () => {
    it('successfully marks lesson as complete', async () => {
      const mockProgress = {
        courseId: 'spec-driven-dev-mini',
        completedLessons: ['lesson-1', 'lesson-2'],
        lastAccessedLesson: 'lesson-2',
        percentage: 67,
        totalLessons: 3,
        updatedAt: new Date().toISOString(),
      };

      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockProgress,
      } as Response);

      const result = await markLessonComplete(mockCourseId, 'lesson-2');

      expect(auth.getAuthToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/api/progress`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          },
          body: JSON.stringify({ courseId: mockCourseId, lessonId: 'lesson-2' }),
          cache: 'no-store',
        })
      );

      expect(result).toEqual(mockProgress);
    });

    it('returns error when not authenticated', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(null);

      const result = await markLessonComplete(mockCourseId, 'lesson-1');

      expect(result).toEqual({
        error: 'Authentication required',
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns error for 404 lesson/course not found', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: 'Lesson not found' }),
      } as Response);

      const result = await markLessonComplete(mockCourseId, 'lesson-999');

      expect(result).toEqual({
        error: 'Course or lesson not found',
      });
    });

    it('handles network errors', async () => {
      (auth.getAuthToken as jest.Mock).mockResolvedValue(mockToken);
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await markLessonComplete(mockCourseId, 'lesson-1');

      expect(result).toEqual({
        error: 'Failed to connect to backend. Please check if backend is running.',
      });
    });
  });
});
