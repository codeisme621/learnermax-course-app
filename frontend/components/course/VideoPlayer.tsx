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

  // Check for specific HTTP error codes
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

  // Default fallback
  return errorMessage || 'Failed to load video';
}

export function VideoPlayer({
  lessonId,
  courseId,
  onLessonComplete,
  onCourseComplete,
  onError,
  autoPlay = false,
  isLastLesson = false,
  onReadyToComplete,
}: VideoPlayerProps) {
  // Use SWR hook for trackAccess and cache revalidation (mutate)
  const { trackAccess, mutate: mutateProgress } = useProgress(courseId);

  // Use SWR hook for video URL (auto-refreshes every 5 min)
  const { videoUrl, expiresAt, isLoading, error: urlError, refreshUrl } = useVideoUrl(lessonId);

  // Video playback error state (separate from URL fetch errors)
  const [videoError, setVideoError] = useState<string | null>(null);

  // Progress tracking state
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);

  // Ref to track if we're currently marking complete (prevent race conditions)
  const isMarkingComplete = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Video element ref for progress tracking
  const videoRef = useRef<HTMLVideoElement>(null);

  // Track lesson access on mount or when lessonId changes
  useEffect(() => {
    trackAccess(lessonId);
    // Reset completion state for new lesson
    setHasMarkedComplete(false);
    setVideoError(null);
    isMarkingComplete.current = false;
  }, [lessonId, trackAccess]);

  // Cleanup: Pause video when component unmounts or video changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    return () => {
      video.pause();
      video.src = '';
    };
  }, [videoUrl]);

  // Notify parent of URL fetch errors
  useEffect(() => {
    if (urlError) {
      const friendlyError = getUserFriendlyError(urlError.message);
      onError?.(new Error(friendlyError));
    }
  }, [urlError, onError]);

  // Debug: Log when videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      console.log('[VideoPlayer] Rendering player with URL:', videoUrl);
      console.log('[VideoPlayer] Expires at:', expiresAt?.toISOString());
    }
  }, [videoUrl, expiresAt]);

  // Handle progress updates with native video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = async () => {
      const duration = video.duration;
      const currentTime = video.currentTime;

      if (!duration || !currentTime) return;

      const played = currentTime / duration;

      // Check if 90% watched and haven't marked complete yet
      if (played >= 0.9 && !hasMarkedComplete && !isMarkingComplete.current) {
        // If this is the last lesson, notify parent instead of auto-completing
        if (isLastLesson) {
          console.log('[VideoPlayer] Last lesson reached 90%, notifying parent');
          setHasMarkedComplete(true);
          onReadyToComplete?.();
          return;
        }

        // Auto-complete for non-last lessons
        console.log('[VideoPlayer] Marking lesson as complete');
        isMarkingComplete.current = true;
        setHasMarkedComplete(true);

        try {
          // Call server action directly (like the old working code)
          const result = await markLessonComplete(courseId, lessonId);
          console.log('[VideoPlayer] markLessonComplete result:', result);

          if ('error' in result) {
            throw new Error(result.error);
          }

          // Refresh SWR cache so sidebar/header update
          await mutateProgress();
          console.log('[VideoPlayer] Lesson marked complete, cache refreshed');
          onLessonComplete?.();
        } catch (err) {
          console.error('Failed to mark lesson complete:', err);
          setHasMarkedComplete(false);
          isMarkingComplete.current = false;
        } finally {
          isMarkingComplete.current = false;
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    // videoUrl in deps ensures effect re-runs when video element appears
  }, [hasMarkedComplete, lessonId, courseId, isLastLesson, onLessonComplete, onReadyToComplete, mutateProgress, videoUrl]);

  // Handle video playback errors (codec issues, streaming failures, etc.)
  const handleVideoError = () => {
    const errorMessage = 'Unable to play this video. Try again or contact support if the issue persists';
    setVideoError(errorMessage);
    onError?.(new Error(errorMessage));
  };

  // Retry loading video using SWR's mutate
  const handleRetry = () => {
    setVideoError(null);
    refreshUrl();
  };

  // Derive display error from URL error or video playback error
  const displayError = urlError ? getUserFriendlyError(urlError.message) : videoError;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
    >
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-lg">Loading video...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {displayError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black p-8">
          <div className="text-red-500 text-lg text-center max-w-md">{displayError}</div>
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Video player */}
      {videoUrl && !displayError && (
        <div className="w-full h-full" data-testid="video-player" data-url={videoUrl}>
          <video
            ref={videoRef}
            key={videoUrl}
            src={videoUrl}
            controls
            controlsList="nodownload"
            playsInline
            autoPlay={autoPlay}
            className="w-full h-full"
            onLoadedData={() => {
              console.log('[VideoPlayer] Native video loaded successfully');
            }}
            onError={() => handleVideoError()}
            onPlay={() => {
              console.log('[VideoPlayer] Native video started playing');
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
}
