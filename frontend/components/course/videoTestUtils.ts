import { fireEvent, act } from '@testing-library/react';

/**
 * Simulate video loaded by firing the loadeddata event
 * This must be called before simulateVideoProgress to enable progress tracking
 * @param container - The container element (should contain a video element)
 */
export function simulateVideoLoaded(container: HTMLElement) {
  const video = container.querySelector('video');
  if (!video) {
    throw new Error('No video element found in container');
  }

  // Mock video properties needed for loaded state
  Object.defineProperty(video, 'duration', {
    get: () => 200, // 200 seconds total
    configurable: true,
  });

  // Fire loadeddata event to set isVideoReady=true in VideoPlayer
  fireEvent.loadedData(video);
}

/**
 * Simulate video progress by setting currentTime and duration properties
 * NOTE: Call simulateVideoLoaded first in a separate act() block to enable progress tracking
 * @param container - The container element (should contain a video element)
 * @param percentage - Progress percentage (0-1, e.g., 0.91 for 91%)
 */
export function simulateVideoProgress(container: HTMLElement, percentage: number) {
  const video = container.querySelector('video');
  if (!video) {
    throw new Error('No video element found in container');
  }

  // Store the percentage value so the getter can reference it
  let currentPercentage = percentage;

  // Mock video properties - use getter to ensure values are read correctly
  Object.defineProperty(video, 'duration', {
    get: () => 200, // 200 seconds total
    configurable: true,
  });

  Object.defineProperty(video, 'currentTime', {
    get: () => 200 * currentPercentage,
    set: (val: number) => { currentPercentage = val / 200; },
    configurable: true,
  });

  // Trigger timeupdate event
  fireEvent.timeUpdate(video);
}

/**
 * Simulate video loaded AND progress in one call (for simpler tests)
 * This combines loadeddata and timeupdate with proper sequencing
 * @param container - The container element (should contain a video element)
 * @param percentage - Progress percentage (0-1, e.g., 0.91 for 91%)
 */
export async function simulateVideoLoadedAndProgress(container: HTMLElement, percentage: number) {
  // Get video element from the container
  let video = container.querySelector('video');
  if (!video) {
    throw new Error('No video element found in container');
  }

  // Set up duration getter first
  Object.defineProperty(video, 'duration', {
    get: () => 200,
    configurable: true,
  });

  // Fire loadeddata event
  fireEvent.loadedData(video);

  // Wait for React to process state update and run effects
  await act(async () => {
    // Multiple ticks to ensure effects are flushed
    await new Promise(resolve => setTimeout(resolve, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  // Re-query video element after React updates (in case it changed)
  const videoAfter = container.querySelector('video');
  if (videoAfter && videoAfter !== video) {
    video = videoAfter;
  }

  // Set up properties on the current video element
  Object.defineProperty(video, 'duration', {
    get: () => 200,
    configurable: true,
  });

  Object.defineProperty(video, 'currentTime', {
    get: () => 200 * percentage,
    configurable: true,
  });

  // Fire timeupdate event
  const event = new Event('timeupdate', { bubbles: false, cancelable: false });
  video.dispatchEvent(event);

  // Wait for async handler to complete
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
  });
}

/**
 * Get the video element from a container
 * @param container - The container element
 * @returns The video element
 */
export function getVideoElement(container: HTMLElement): HTMLVideoElement {
  const video = container.querySelector('video');
  if (!video) {
    throw new Error('No video element found in container');
  }
  return video;
}

/**
 * Mock video element properties for testing
 * @param video - The video element
 * @param props - Properties to set on the video element
 */
export function mockVideoProperties(
  video: HTMLVideoElement,
  props: Partial<{
    duration: number;
    currentTime: number;
    paused: boolean;
    ended: boolean;
  }>
) {
  Object.entries(props).forEach(([key, value]) => {
    Object.defineProperty(video, key, {
      value,
      writable: true,
      configurable: true,
    });
  });
}
