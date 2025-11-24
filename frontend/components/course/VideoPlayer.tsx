'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getVideoUrl } from '@/app/actions/lessons';
import { markLessonComplete } from '@/app/actions/progress';

// Dynamically import react-confetti
const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

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
  // Video URL state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Progress tracking state
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  const [showCompleteOverlay, setShowCompleteOverlay] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Ref to track if we're currently marking complete (prevent race conditions)
  const isMarkingComplete = useRef(false);

  // Confetti dimensions (match video player size)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Video element ref for progress tracking
  const videoRef = useRef<HTMLVideoElement>(null);

  // Update dimensions for confetti
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Fetch video URL on mount or when lessonId changes
  useEffect(() => {
    async function fetchVideo() {
      try {
        setIsLoading(true);
        setError(null);
        setVideoError(null); // Reset video playback errors too
        setHasMarkedComplete(false); // Reset completion state for new lesson

        const result = await getVideoUrl(lessonId);

        if ('error' in result) {
          console.error('[VideoPlayer] getVideoUrl error:', result.error);
          throw new Error(result.error);
        }

        console.log('[VideoPlayer] Fetched video URL, expires at:', new Date(result.expiresAt * 1000).toISOString());
        console.log('[VideoPlayer] Video URL:', result.videoUrl);

        setVideoUrl(result.videoUrl);
        setExpiresAt(new Date(result.expiresAt * 1000));
      } catch (err) {
        const rawError = err instanceof Error ? err.message : 'Failed to load video';
        const friendlyError = getUserFriendlyError(rawError);
        setError(friendlyError);
        onError?.(err instanceof Error ? err : new Error(rawError));
      } finally {
        setIsLoading(false);
      }
    }

    fetchVideo();
  }, [lessonId, onError]);

  // Debug: Log when videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      console.log('[VideoPlayer] Rendering player with URL:', videoUrl);
      console.log('[VideoPlayer] Loading state:', isLoading);
      console.log('[VideoPlayer] Error state:', error);
      console.log('[VideoPlayer] Video error state:', videoError);
    }
  }, [videoUrl, isLoading, error, videoError]);

  // Handle progress updates with native video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = async () => {
      console.log('[VideoPlayer] Handle Time update:', video.currentTime);
      const duration = video.duration;
      const currentTime = video.currentTime;

      if (!duration || !currentTime) return;

      const played = currentTime / duration;

      console.log('[VideoPlayer] Video played percentage:', played);

      // Check if 90% watched and haven't marked complete yet
      if (played >= 0.9 && !hasMarkedComplete && !isMarkingComplete.current) {
        // If this is the last lesson, notify parent instead of auto-completing
        if (isLastLesson) {
          console.log('[VideoPlayer] Last lesson reached 90%, notifying parent');
          setHasMarkedComplete(true); // Prevent multiple notifications
          onReadyToComplete?.();
          return;
        }

        // Auto-complete for non-last lessons
        console.log('[VideoPlayer] Marking lesson as complete');
        isMarkingComplete.current = true;
        setHasMarkedComplete(true);

        try {
          const result = await markLessonComplete(courseId, lessonId);
          console.log('[VideoPlayer] markLessonComplete result:', result);

          if ('error' in result) {
            throw new Error(result.error);
          }

          // Just show simple lesson complete overlay (not last lesson, so can't be 100%)
          console.log('[VideoPlayer] Lesson complete, showing overlay');
          setShowCompleteOverlay(true);
          setTimeout(() => {
            setShowCompleteOverlay(false);
          }, 3000);
          onLessonComplete?.();
        } catch (err) {
          console.error('Failed to mark lesson complete:', err);
          // Reset flags to allow retry
          setHasMarkedComplete(false);
          isMarkingComplete.current = false;
        } finally {
          isMarkingComplete.current = false;
        }
      }

      // Check URL expiration (refetch if < 2 minutes remaining)
      if (expiresAt) {
        const now = new Date();
        const timeRemaining = expiresAt.getTime() - now.getTime();
        const twoMinutesInMs = 2 * 60 * 1000;

        if (timeRemaining < twoMinutesInMs && timeRemaining > 0) {
          // Refetch video URL
          try {
            const result = await getVideoUrl(lessonId);
            if ('error' in result) {
              console.error('Failed to refresh video URL:', result.error);
            } else {
              setVideoUrl(result.videoUrl);
              setExpiresAt(new Date(result.expiresAt * 1000));
              // Update video src
              if (video) {
                video.src = result.videoUrl;
              }
            }
          } catch (err) {
            console.error('Failed to refresh video URL:', err);
          }
        }
      }
    };

    // Listen to timeupdate events to track progress
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [hasMarkedComplete, courseId, lessonId, expiresAt, onLessonComplete, onCourseComplete]);

  // Handle video playback errors (codec issues, streaming failures, etc.)
  const handleVideoError = (error: unknown, data?: unknown) => {
    console.error('[VideoPlayer] Video playback error:', error);
    console.error('[VideoPlayer] Error details:', data);
    console.error('[VideoPlayer] Current video URL:', videoUrl);
    const errorMessage = 'Unable to play this video. Try again or contact support if the issue persists';
    setVideoError(errorMessage);
    onError?.(new Error(errorMessage));
  };

  // Retry loading video
  const handleRetry = () => {
    setError(null);
    setVideoError(null);
    setIsLoading(true);
    getVideoUrl(lessonId)
      .then((result) => {
        if ('error' in result) {
          throw new Error(result.error);
        }
        setVideoUrl(result.videoUrl);
        setExpiresAt(new Date(result.expiresAt * 1000));
        setIsLoading(false);
      })
      .catch((err) => {
        const rawError = err instanceof Error ? err.message : 'Failed to load video';
        const friendlyError = getUserFriendlyError(rawError);
        setError(friendlyError);
        setIsLoading(false);
      });
  };

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
      {(error || videoError) && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black p-8">
          <div className="text-red-500 text-lg text-center max-w-md">{error || videoError}</div>
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Video player */}
      {videoUrl && !error && !videoError && (
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
            onError={(e) => {
              console.error('[VideoPlayer] Native video error:', e);
              handleVideoError(e);
            }}
            onPlay={() => {
              console.log('[VideoPlayer] Native video started playing');
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      )}

      {/* Lesson complete overlay (simple checkmark) */}
      {showCompleteOverlay && !showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="bg-white rounded-full p-8 shadow-2xl">
            <div className="text-green-600 text-4xl font-bold flex items-center gap-3">
              <span className="text-5xl">✓</span>
              <span>Lesson Complete</span>
            </div>
          </div>
        </div>
      )}

      {/* Course 100% complete celebration (confetti) */}
      {showCelebration && (
        <>
          <Confetti
            width={dimensions.width}
            height={dimensions.height}
            recycle={false}
            numberOfPieces={500}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-none">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-10 shadow-2xl animate-bounce-in">
              <div className="text-white text-5xl font-bold text-center">
                🎉 Course Complete! 🎉
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
