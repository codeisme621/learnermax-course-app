'use client';

import { useEffect, useState, useRef } from 'react';
import Hls from 'hls.js';
import { useProgress } from '@/hooks/useProgress';
import { markLessonComplete } from '@/app/actions/progress';

interface VideoPlayerProps {
  lessonId: string;
  courseId: string;
  manifestUrl: string | null;  // HLS manifest URL (replaces useVideoUrl)
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
  // HLS-specific errors
  if (lowerError.includes('manifestloaderror') || lowerError.includes('manifestparseerror')) {
    return 'Unable to load video. Please try again';
  }
  if (lowerError.includes('fragsloaderror')) {
    return 'Video playback interrupted. Check your connection';
  }
  return errorMessage || 'Failed to load video';
}

/**
 * VideoPlayer component with HLS.js support
 *
 * Key features:
 * - Uses HLS.js for adaptive bitrate streaming on Chrome/Firefox
 * - Falls back to native HLS on Safari
 * - Preserves all existing behaviors: pause on scroll/tab, progress tracking, etc.
 */
export function VideoPlayer({
  lessonId,
  courseId,
  manifestUrl,
  onLessonComplete,
  onError,
  autoPlay = false,
  isLastLesson = false,
  onReadyToComplete,
}: VideoPlayerProps) {
  // Hooks
  const { trackAccess, mutate: mutateProgress } = useProgress(courseId);

  // State
  const [videoError, setVideoError] = useState<string | null>(null);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isMarkingComplete = useRef(false);
  const wasPlayingBeforeHidden = useRef(false);

  // ========== HLS.js Initialization ==========
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !manifestUrl) return;

    setIsLoading(true);
    setVideoError(null);

    // Safari has native HLS support
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[VideoPlayer] Using native HLS (Safari)');
      video.src = manifestUrl;

      const handleCanPlay = () => {
        setIsLoading(false);
        setIsVideoReady(true);
      };

      video.addEventListener('canplay', handleCanPlay);
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
      };
    }

    // Use HLS.js for other browsers
    if (Hls.isSupported()) {
      console.log('[VideoPlayer] Using HLS.js');
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 60,
        startLevel: -1, // Auto-select quality
        xhrSetup: (xhr) => {
          xhr.withCredentials = true; // Send cookies with requests
        },
      });

      hls.loadSource(manifestUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[VideoPlayer] HLS manifest parsed, video ready');
        setIsLoading(false);
        setIsVideoReady(true);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('[VideoPlayer] HLS fatal error:', data.type, data.details);
          setVideoError(getUserFriendlyError(`HLS Error: ${data.details}`));
          onError?.(new Error(`HLS Error: ${data.details}`));

          // Attempt recovery for network/media errors
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.log('[VideoPlayer] Attempting to recover from network error');
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.log('[VideoPlayer] Attempting to recover from media error');
            hls.recoverMediaError();
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        console.log('[VideoPlayer] Destroying HLS instance');
        hls.destroy();
        hlsRef.current = null;
      };
    }

    // HLS not supported
    setVideoError('HLS not supported in this browser');
    onError?.(new Error('HLS not supported in this browser'));
  }, [manifestUrl, onError]);

  // ========== PRESERVED: Scroll visibility pause ==========
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const checkVisibility = () => {
      if (document.fullscreenElement) return;
      if (!video.paused && video.offsetParent === null) {
        console.log('[VideoPlayer] Video not visible (hidden), pausing');
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (document.fullscreenElement) return;
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
    const visibilityInterval = setInterval(checkVisibility, 500);

    return () => {
      observer.disconnect();
      clearInterval(visibilityInterval);
      if (video && !video.paused && !document.fullscreenElement) {
        console.log('[VideoPlayer] Effect cleanup, pausing video');
        video.pause();
      }
    };
  }, [isVideoReady]);

  // ========== PRESERVED: Tab visibility pause/resume ==========
  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;

      if (document.hidden) {
        wasPlayingBeforeHidden.current = !video.paused;
        if (!video.paused) {
          console.log('[VideoPlayer] Page hidden, pausing video');
          video.pause();
        }
      } else {
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

  // ========== PRESERVED: Cleanup on unmount ==========
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        console.log('[VideoPlayer] Unmounting, pausing video');
        video.pause();
      }
    };
  }, []);

  // ========== PRESERVED: Track access and reset state ==========
  useEffect(() => {
    trackAccess(lessonId);
    setHasMarkedComplete(false);
    setVideoError(null);
    setIsVideoReady(false);
    setIsLoading(true);
    isMarkingComplete.current = false;
  }, [lessonId, trackAccess]);

  // ========== Autoplay when video ready and autoPlay prop is true ==========
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoReady || !autoPlay) return;

    console.log('[VideoPlayer] Autoplay enabled and video ready, starting playback');
    video.play().catch(err => {
      // Browser may block autoplay if user hasn't interacted with page
      console.log('[VideoPlayer] Autoplay blocked:', err.message);
    });
  }, [isVideoReady, autoPlay]);

  // ========== PRESERVED: Progress tracking at 90% ==========
  useEffect(() => {
    if (!isVideoReady) return;

    const video = videoRef.current;
    if (!video) return;

    console.log('[VideoPlayer] Setting up timeupdate listener for progress tracking');

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
  }, [isVideoReady, hasMarkedComplete, lessonId, courseId, isLastLesson, onLessonComplete, onReadyToComplete, mutateProgress]);

  // ========== Retry handler for HLS ==========
  const handleRetry = () => {
    setVideoError(null);
    setIsVideoReady(false);
    setIsLoading(true);

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Re-trigger initialization by forcing video reload
    const video = videoRef.current;
    if (video && manifestUrl) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = manifestUrl;
        video.load();
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          xhrSetup: (xhr) => { xhr.withCredentials = true; },
        });
        hls.loadSource(manifestUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setIsVideoReady(true);
        });
        hlsRef.current = hls;
      }
    }
  };

  const handleVideoError = () => {
    setVideoError('Unable to play this video. Try again or contact support if the issue persists');
    onError?.(new Error('Video playback failed'));
  };

  // ========== RENDER ==========

  // No manifest URL
  if (!manifestUrl) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg">Video not available</p>
        </div>
      </div>
    );
  }

  // Error state
  if (videoError) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-red-500 text-lg text-center max-w-md">{videoError}</div>
        <button
          onClick={handleRetry}
          className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Video player
  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden" data-testid="video-player">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-lg">Loading video...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        key={lessonId}
        controls
        controlsList="nodownload"
        playsInline
        autoPlay={autoPlay && isVideoReady}
        className="w-full h-full"
        onError={handleVideoError}
        onPlay={() => console.log('[VideoPlayer] Video started playing')}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
