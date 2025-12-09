'use server';

import { getAuthToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export type FeedbackCategory = 'bug' | 'feature' | 'general';

export interface SubmitFeedbackRequest {
  feedback: string;
  category: FeedbackCategory;
  rating?: number; // 1-5, only for 'general' category
}

export interface SubmitFeedbackResponse {
  feedbackId: string;
}

/**
 * Submit user feedback
 * Protected endpoint - requires authentication
 *
 * @param data - Feedback data including message, category, and optional rating
 * @returns Feedback ID or error
 */
export async function submitFeedback(
  data: SubmitFeedbackRequest
): Promise<SubmitFeedbackResponse | { error: string }> {
  console.log('[submitFeedback] Submitting feedback:', { category: data.category, hasRating: !!data.rating });

  try {
    const token = await getAuthToken();

    if (!token) {
      console.error('[submitFeedback] No auth token available');
      return { error: 'Authentication required' };
    }

    const endpoint = `${API_URL}/api/feedback`;
    console.log('[submitFeedback] Posting to:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      cache: 'no-store',
    });

    console.log('[submitFeedback] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[submitFeedback] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: endpoint,
      });

      if (response.status === 401) {
        return { error: 'Please sign in to submit feedback' };
      }
      if (response.status === 400) {
        return { error: 'Invalid feedback data' };
      }
      return { error: `Failed to submit feedback: ${response.statusText}` };
    }

    const result: SubmitFeedbackResponse = await response.json();
    console.log('[submitFeedback] Successfully submitted feedback:', { feedbackId: result.feedbackId });
    return result;
  } catch (error) {
    console.error('[submitFeedback] Exception occurred:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { error: 'Failed to connect to server. Please try again later.' };
    }
    return { error: 'Failed to submit feedback' };
  }
}
