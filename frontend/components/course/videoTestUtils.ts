import { fireEvent } from '@testing-library/react';

/**
 * Simulate video progress by setting currentTime and duration properties
 * @param container - The container element (should contain a video element)
 * @param percentage - Progress percentage (0-1, e.g., 0.91 for 91%)
 */
export function simulateVideoProgress(container: HTMLElement, percentage: number) {
  const video = container.querySelector('video');
  if (!video) {
    throw new Error('No video element found in container');
  }

  // Mock video properties
  Object.defineProperty(video, 'duration', {
    value: 200, // 200 seconds total
    writable: true,
    configurable: true,
  });

  Object.defineProperty(video, 'currentTime', {
    value: 200 * percentage, // e.g., 180 seconds for 90%
    writable: true,
    configurable: true,
  });

  // Trigger timeupdate event
  fireEvent.timeUpdate(video);
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
