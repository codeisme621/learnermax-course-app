'use client';

import { useEffect, useState, useRef } from 'react';
import { useVideoUrl } from '@/hooks/useVideoUrl';
import { useProgress } from '@/hooks/useProgress';
import { markLessonComplete } from '@/app/actions/progress';

interface VideoPlayerProps {
  lessonId: string;
  courseId: string;
  onLessonComplete?: () => void;
  onCourseComplete?: () => void;
  onError?: (error: Error) => void;
  autoPlay?: boolean;
  isLastLesson?: boolean;
  onReadyToComplete?: () => void;
}

/**
 * Map error messages to user-friendly text
 */
function getUserFriendlyError(errorMessage: string): string {
  const lowerError = errorMessage.toLowerCase();

  if (lowerError.includes('403') || lowerError.includes('forbidden') || lowerError.includes('not enrolled')) {
    return 'Please enroll in this course to watch lessons';
  }
  if (lowerError.includes('404') || lowerError.includes('not found') || lowerError.includes('not available')) {
    return 'This lesson is not available';
  }
  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connect')) {
    return 'Connection failed. Check your internet and try again';
  }
  if (lowerError.includes('authentication') || lowerError.includes('auth')) {
    return 'Please sign in to continue';
  }
  return errorMessage || 'Failed to load video';
}

/**
 * Simplified VideoPlayer component
 *
 * Key principles:
 * - Only render <video> when we have a valid URL
 * - Use key={lessonId} for clean remount on lesson change
 * - Minimal state and refs
 */
export function VideoPlayer({
  lessonId,
  courseId,
  onLessonComplete,
  onError,
  autoPlay = false,
  isLastLesson = false,
  onReadyToComplete,
}: VideoPlayerProps) {
  // Hooks
  const { videoUrl, isLoading, error: urlError, refreshUrl } = useVideoUrl(lessonId);
  const { trackAccess, mutate: mutateProgress } = useProgress(courseId);

  // State
  const [videoError, setVideoError] = useState<string | null>(null);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMarkingComplete = useRef(false);
  const wasPlayingBeforeHidden = useRef(false);

  // Pause video when it becomes invisible (navigated away, scrolled out of view)
  // This handles Next.js App Router caching where component stays mounted
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if video is actually visible (has dimensions and offsetParent)
    // Skip check if in fullscreen mode (offsetParent is null in fullscreen)
    const checkVisibility = () => {
      if (document.fullscreenElement) return; // Don't pause in fullscreen
      if (!video.paused && video.offsetParent === null) {
        console.log('[VideoPlayer] Video not visible (hidden), pausing');
        video.pause();
      }
    };

    // Use IntersectionObserver for scroll-based visibility
    // Skip if in fullscreen mode
    const observer = new IntersectionObserver(
      (entries) => {
        if (document.fullscreenElement) return; // Don't pause in fullscreen
        entries.forEach((entry) => {
          if (!entry.isIntersecting && !video.paused) {
            console.log('[VideoPlayer] Video scrolled out of view, pausing');
            video.pause();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(video);

    // Also poll for visibility since IntersectionObserver may miss hidden state
    const visibilityInterval = setInterval(checkVisibility, 500);

    return () => {
      observer.disconnect();
      clearInterval(visibilityInterval);
      // Pause video when effect cleans up (navigation away or URL change)
      // But not if in fullscreen mode
      if (video && !video.paused && !document.fullscreenElement) {
        console.log('[VideoPlayer] Effect cleanup, pausing video');
        video.pause();
      }
    };
  }, [videoUrl]); // Re-run when video URL changes (new video element)

  // Pause video when page becomes hidden (tab switch) and resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;

      if (document.hidden) {
        // Tab becoming hidden - remember if video was playing
        wasPlayingBeforeHidden.current = !video.paused;
        if (!video.paused) {
          console.log('[VideoPlayer] Page hidden, pausing video');
          video.pause();
        }
      } else {
        // Tab becoming visible - resume if video was playing before
        if (wasPlayingBeforeHidden.current) {
          console.log('[VideoPlayer] Page visible, resuming video');
          video.play().catch(err => {
            console.log('[VideoPlayer] Could not resume:', err.message);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Cleanup: pause video on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        console.log('[VideoPlayer] Unmounting, pausing video');
        video.pause();
      }
    };
  }, []);

  // Track access and reset state when lesson changes
  useEffect(() => {
    trackAccess(lessonId);
    setHasMarkedComplete(false);
    setVideoError(null);
    isMarkingComplete.current = false;
  }, [lessonId, trackAccess]);

  // Notify parent of URL fetch errors
  useEffect(() => {
    if (urlError) {
      onError?.(new Error(getUserFriendlyError(urlError.message)));
    }
  }, [urlError, onError]);

  // Progress tracking - mark complete at 90%
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = async () => {
      const { duration, currentTime } = video;
      if (!duration || !currentTime) return;

      const played = currentTime / duration;

      if (played >= 0.9 && !hasMarkedComplete && !isMarkingComplete.current) {
        isMarkingComplete.current = true;
        setHasMarkedComplete(true);

        if (isLastLesson) {
          console.log('[VideoPlayer] Last lesson reached 90%, notifying parent');
          onReadyToComplete?.();
          return;
        }

        try {
          console.log('[VideoPlayer] Marking lesson as complete');
          const result = await markLessonComplete(courseId, lessonId);
          if ('error' in result) throw new Error(result.error);
          await mutateProgress();
          console.log('[VideoPlayer] Lesson marked complete');
          onLessonComplete?.();
        } catch (err) {
          console.error('Failed to mark lesson complete:', err);
          setHasMarkedComplete(false);
          isMarkingComplete.current = false;
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [hasMarkedComplete, lessonId, courseId, isLastLesson, onLessonComplete, onReadyToComplete, mutateProgress]);

  // Handlers
  const handleVideoError = () => {
    setVideoError('Unable to play this video. Try again or contact support if the issue persists');
    onError?.(new Error('Video playback failed'));
  };

  const handleRetry = () => {
    setVideoError(null);
    refreshUrl();
  };

  // Derive display state
  const displayError = urlError ? getUserFriendlyError(urlError.message) : videoError;

  // Loading state
  if (isLoading) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg">Loading video...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (displayError) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-red-500 text-lg text-center max-w-md">{displayError}</div>
        <button
          onClick={handleRetry}
          className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // No URL yet (shouldn't happen if not loading/error, but safety check)
  if (!videoUrl) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg">Loading video...</p>
        </div>
      </div>
    );
  }

  // Video player - only rendered when we have a valid URL
  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden" data-testid="video-player">
      <video
        ref={videoRef}
        key={lessonId}
        src={videoUrl}
        controls
        controlsList="nodownload"
        playsInline
        autoPlay={autoPlay}
        className="w-full h-full"
        onLoadedData={() => console.log('[VideoPlayer] Video loaded successfully')}
        onError={handleVideoError}
        onPlay={() => console.log('[VideoPlayer] Video started playing')}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
