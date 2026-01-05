'use cache';

import { cacheLife, cacheTag } from 'next/cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Public meetup data - no user-specific fields
 * isSignedUp is derived client-side from useStudent().signedUpMeetups
 */
export interface MeetupData {
  meetupId: string;
  title: string;
  description: string;
  nextOccurrence: string; // ISO timestamp
  isRunning: boolean;
  zoomLink?: string; // Only present if isRunning = true
  duration: number;
  hostName: string;
}

/**
 * Fetch all meetups (public data only)
 * Cached with 'minutes' profile - isRunning changes based on time
 *
 * Note: After Slice 5, this endpoint returns only public data.
 * isSignedUp is derived client-side from useStudent().signedUpMeetups
 *
 * @param token - Auth token (still required for authentication)
 * @returns Array of meetups or error object
 */
export async function getMeetups(
  token: string
): Promise<MeetupData[] | { error: string }> {
  'use cache';
  cacheLife('minutes');
  cacheTag('meetups');

  console.log('[getMeetups] Fetching meetups (cached)');

  try {
    const response = await fetch(`${API_URL}/api/meetups`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getMeetups] Backend returned error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      return { error: `Failed to fetch meetups: ${response.statusText}` };
    }

    const meetups = await response.json();

    console.log('[getMeetups] Fetched meetups successfully', {
      count: meetups.length,
      meetupIds: meetups.map((m: MeetupData) => m.meetupId),
    });

    // Map to public data only (remove isSignedUp if present from backend)
    return meetups.map((m: MeetupData & { isSignedUp?: boolean }) => ({
      meetupId: m.meetupId,
      title: m.title,
      description: m.description,
      nextOccurrence: m.nextOccurrence,
      isRunning: m.isRunning,
      zoomLink: m.zoomLink,
      duration: m.duration,
      hostName: m.hostName,
    }));
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('[getMeetups] Network error - backend may be unreachable:', error);
      return { error: 'Unable to connect to server. Please check your internet connection.' };
    }

    console.error('[getMeetups] Unexpected error fetching meetups:', error);
    return { error: 'An unexpected error occurred while fetching meetups' };
  }
}
