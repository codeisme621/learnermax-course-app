# Slice 7: HLS Integration & Cleanup

## Objective

Integrate HLS.js into the existing `VideoPlayer` component and remove deprecated code. This delivers adaptive bitrate streaming while preserving all current functionality.

## Why This Slice

- HLS.js enables adaptive bitrate streaming in all browsers
- Safari has native HLS support (no library needed)
- Adapting existing component preserves all current functionality
- Remove unused code (`useVideoUrl` hook) after migration

## Dependencies

- Slice 5 (Videos encoded to HLS format with `hlsManifestKey` in lesson data)
- Slice 6 (Proxy sets CloudFront cookies before page renders)

---

## Player Comparison

| Feature | Current (Native) | New (HLS.js) |
|---------|-----------------|--------------|
| Start time | 2-4 seconds | < 1 second |
| Adaptive quality | No | Yes (360p-1080p) |
| Seeking | Slow (reload from start) | Fast (segment-based) |
| Bundle size | 0 | ~50KB |
| Safari support | Yes | Native HLS fallback |

---

## Current Architecture

```
CourseVideoSection (Client Component)
    ↓ passes lessonId, courseId, callbacks
VideoPlayer (Client Component)
    ↓ uses useVideoUrl hook
    ↓ fetches signed S3 URL from backend
    ↓ renders <video src={signedUrl}>
```

## Target Architecture

```
CourseVideoSection (Client Component)
    ↓ constructs manifestUrl from hlsManifestKey
    ↓ passes manifestUrl, lessonId, courseId, callbacks
VideoPlayer (Client Component)
    ↓ receives manifestUrl as prop (no useVideoUrl)
    ↓ uses HLS.js to load manifest
    ↓ cookies sent automatically with requests
```

---

## Preserved Functionality

The adapted VideoPlayer MUST preserve all existing features from `frontend/components/course/VideoPlayer.tsx`:

| Feature | Current Location | After Adaptation |
|---------|-----------------|------------------|
| Tab visibility pause/resume | Lines 110-134 | Preserved |
| Scroll-out-of-view pause | Lines 72-108 (IntersectionObserver) | Preserved |
| 90% completion tracking | Lines 163-212 | Preserved |
| Last access tracking | Line 149 (`trackAccess`) | Preserved |
| Error handling with retry | Lines 220-258 | Preserved (adapted for HLS errors) |
| Loading skeleton | Lines 235-244 | Preserved |
| Last lesson handling | `onReadyToComplete` callback | Preserved |
| All callbacks | `onLessonComplete`, `onError`, etc. | Preserved |

---

## Deliverables

### 7.1 Install HLS.js

```bash
cd frontend
pnpm add hls.js
```

Note: `@types/hls.js` is not needed - hls.js ships with TypeScript types.

### 7.2 Update CourseVideoSection

**File:** `frontend/components/course/CourseVideoSection.tsx`

Construct manifest URL and pass to VideoPlayer:

```typescript
// Add at top of file
const CLOUDFRONT_DOMAIN = process.env.NEXT_PUBLIC_VIDEO_CLOUDFRONT_DOMAIN!;

// Inside the component, before rendering VideoPlayer:
const manifestUrl = currentLesson.hlsManifestKey
  ? `https://${CLOUDFRONT_DOMAIN}/${currentLesson.hlsManifestKey}`
  : null;

// Update VideoPlayer props:
<VideoPlayer
  lessonId={currentLesson.lessonId}
  courseId={courseId}
  manifestUrl={manifestUrl}           // NEW: pass manifest URL
  onLessonComplete={handleLessonComplete}
  onCourseComplete={handleCourseComplete}
  isLastLesson={!nextLesson}
  autoPlay={shouldAutoPlay}
  onReadyToComplete={() => {
    console.log('[CourseVideoSection] Last lesson ready to complete');
    setIsReadyToComplete(true);
  }}
/>
```

### 7.3 Adapt VideoPlayer for HLS

**File:** `frontend/components/course/VideoPlayer.tsx`

Key changes to the existing component:

1. **Add `manifestUrl` prop** (replaces internal `useVideoUrl` hook)
2. **Add HLS.js initialization useEffect**
3. **Add HLS-specific error handling**
4. **Remove `useVideoUrl` import and usage**

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import Hls from 'hls.js';
import { useProgress } from '@/hooks/useProgress';
import { markLessonComplete } from '@/app/actions/progress';

interface VideoPlayerProps {
  lessonId: string;
  courseId: string;
  manifestUrl: string | null;  // NEW: HLS manifest URL (replaces useVideoUrl)
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

  // ========== NEW: HLS.js Initialization ==========
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

  // ========== ADAPTED: Retry handler for HLS ==========
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
```

### 7.4 Delete useVideoUrl Hook

**Delete:** `frontend/hooks/useVideoUrl.ts`

This hook fetched signed S3 URLs for direct video playback. With HLS, the manifest URL is constructed from `hlsManifestKey` and cookies handle authentication.

### 7.5 Remove fetchVideoUrl Fetcher

**File:** `frontend/lib/fetchers.ts`

Remove the `fetchVideoUrl` function:

```typescript
// DELETE this function:
export async function fetchVideoUrl(lessonId: string): Promise<VideoUrlData> {
  // ...
}
```

### 7.6 Verify LessonResponse Type

**File:** `frontend/types/lessons.ts`

Ensure the type includes `hlsManifestKey`:

```typescript
export interface LessonResponse {
  lessonId: string;
  title: string;
  description?: string;
  order: number;
  lengthInMins?: number;
  hlsManifestKey?: string;  // ENSURE THIS EXISTS
  // ... other fields
}
```

### 7.7 Environment Variables

Add to `frontend/.env`:

```bash
NEXT_PUBLIC_VIDEO_CLOUDFRONT_DOMAIN=video.learnwithrico.com
```

---

## HLS.js Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `enableWorker` | true | Parse manifests in Web Worker |
| `lowLatencyMode` | false | VOD, not live streaming |
| `backBufferLength` | 30 | Seconds kept for back-seeking |
| `maxBufferLength` | 60 | Seconds buffered ahead |
| `startLevel` | -1 | Auto-select quality based on bandwidth |
| `withCredentials` | true | Send cookies for signed access |

---

## Error Handling

| Error | Cause | Handling |
|-------|-------|----------|
| 403 from CloudFront | Cookies expired/missing | User refreshes page -> Proxy re-sets cookies |
| No `hlsManifestKey` | Video not encoded yet | Shows "Video not available" |
| HLS.js fatal error | Network/media issue | Shows error with Retry button |
| MANIFEST_LOAD_ERROR | Can't fetch .m3u8 | Shows error, attempts recovery |
| FRAG_LOAD_ERROR | Can't fetch .ts segment | Shows error, attempts recovery |

---

## Verification Checklist

### Video Playback
- [ ] Video loads and plays on Chrome/Firefox (HLS.js)
- [ ] Video loads and plays on Safari (native HLS)
- [ ] Video controls work: play, pause, seek, volume, fullscreen
- [ ] Quality adapts to network conditions (throttle in DevTools)
- [ ] Network tab shows `.m3u8` manifest and `.ts` segment requests

### Preserved Behaviors
- [ ] Tab visibility: video pauses when tab hidden, resumes when visible
- [ ] Scroll visibility: video pauses when scrolled out of view
- [ ] Progress tracking: lesson marked complete at 90%
- [ ] Last access tracking: `trackAccess(lessonId)` still called
- [ ] Error handling: user-friendly messages with Retry button
- [ ] Loading skeleton: shows while HLS manifest loads
- [ ] All callbacks work: `onLessonComplete`, `onReadyToComplete`, `onError`
- [ ] AutoPlay works: video auto-plays when `autoPlay={true}` and ready

### Last Lesson Handling
- [ ] "Complete Course" button appears after 90% of last lesson
- [ ] Clicking "Complete Course" shows confetti
- [ ] Premium upsell modal shows (for free courses)

### Cleanup Verification
- [ ] `useVideoUrl` hook deleted
- [ ] `fetchVideoUrl` function deleted
- [ ] No TypeScript errors after deletions
- [ ] No console errors during video playback

---

## Acceptance Criteria

- [ ] HLS.js installed and working
- [ ] VideoPlayer receives `manifestUrl` prop
- [ ] Safari uses native HLS (no HLS.js loaded)
- [ ] Chrome/Firefox use HLS.js
- [ ] Cookies sent with segment requests (`withCredentials: true`)
- [ ] All preserved behaviors verified (see checklist)
- [ ] `useVideoUrl` hook deleted
- [ ] `fetchVideoUrl` function deleted
- [ ] No TypeScript errors
