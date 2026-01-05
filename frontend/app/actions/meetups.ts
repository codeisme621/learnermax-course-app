'use server';

import { getAuthToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Meetup response from backend API
 * Matches backend MeetupResponse interface
 */
export interface MeetupResponse {
  meetupId: string;
  title: string;
  description: string;
  nextOccurrence: string; // ISO timestamp
  isRunning: boolean;
  isSignedUp: boolean;
  zoomLink?: string; // Only present if isRunning = true
  duration: number;
  hostName: string;
}

/**
 * Sign up for a meetup
 *
 * @param meetupId - The ID of the meetup to sign up for
 * @returns void on success, error object on failure
 */
export async function signupForMeetup(meetupId: string): Promise<void | { error: string }> {
  const token = await getAuthToken();

  if (!token) {
    console.error('[meetups] No auth token available');
    return { error: 'Authentication required' };
  }

  try {
    const response = await fetch(`${API_URL}/api/meetups/${meetupId}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[meetups] Signup failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        meetupId,
      });

      // Handle specific error cases
      if (response.status === 404) {
        return { error: 'Meetup not found' };
      }
      if (response.status === 409) {
        // Already signed up - treat as success (idempotent)
        console.log('[meetups] Student already signed up for meetup', { meetupId });
        return;
      }

      return { error: 'Failed to sign up. Please try again.' };
    }

    console.log('[meetups] Student signed up for meetup', { meetupId });
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('[meetups] Network error during signup:', error);
      return { error: 'Unable to connect to server. Please check your internet connection.' };
    }

    console.error('[meetups] Unexpected error during signup:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}
