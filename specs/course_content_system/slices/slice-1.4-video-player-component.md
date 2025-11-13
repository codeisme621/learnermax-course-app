# Slice 1.4: Video Player Component

**Parent Mainspec:** `specs/course_content_system/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 1.2 (Video Infrastructure - needs signed CloudFront URLs)
- Slice 1.3 (Progress Tracking API - needs `GET /api/lessons/:id/video-url` and `POST /api/progress`)

## Objective
Build a React video player component that loads CloudFront videos, tracks watch progress, and automatically marks lessons complete when the student watches 90% of the video.

## User Flow Narrative

**Student selects a lesson to watch:**
1. Student clicks "Lesson 2: Writing Your First Spec" from lesson list
2. Frontend calls `GET /api/lessons/lesson-2/video-url` → Receives `{ videoUrl: "https://...", expiresAt: 1234567890 }`
3. Video player component mounts with signed URL
4. Video loads and begins buffering
5. Student clicks play button

**Student watches the video:**
1. Video plays from 00:00 to 18:00 (20-minute video)
2. At 18:00 (90% completion) → Frontend calls `POST /api/progress` with `{ courseId, lessonId: "lesson-2" }`
3. Backend updates progress → Returns `{ completedLessons: [..., "lesson-2"], percentage: 40 }`
4. Video player shows simple checkmark overlay: "✓ Lesson Complete"
5. UI updates lesson list to show lesson-2 completed with checkmark

**Student navigates away and returns:**
1. Student closes browser at 12:00 (60% through video)
2. Returns to course page next day
3. Clicks "Lesson 2" again → Video starts from 00:00 (no resume - simpler MVP)
4. Video still marked complete in lesson list (progress persisted)

**Student completes final lesson:**
1. Student finishes lesson-5 (last lesson in 5-lesson course)
2. Video reaches 90% → Frontend calls `POST /api/progress`
3. Backend returns `{ percentage: 100, ... }`
4. Video player detects `percentage === 100` → Shows celebration overlay with confetti
5. After 3 seconds → Triggers `onCourseComplete` callback (parent shows premium upsell modal)

**URL expires while watching:**
1. Student pauses video at 10:00, leaves for 35 minutes
2. Signed URL expired (30-minute expiration)
3. Student clicks play → Video player detects expiration approaching
4. Frontend refetches new signed URL → Seamless playback continues

**Key design decisions from flow:**
- **No video resume** - Video always starts from 00:00 (simpler implementation)
- **90% threshold** for completion (allows skipping credits/outro)
- **Debounced progress tracking** (max once per 30 seconds to reduce API calls)
- **URL expiration handling** (refetch if `expiresAt` < 2 minutes away)
- **One-time completion** (don't call `POST /api/progress` multiple times for same lesson)
- **Celebration only on 100% course completion** (not per-lesson)

## What We're Doing

### 1. Video Player Component
**New file:** `frontend/components/VideoPlayer.tsx`

**Component interface:**
```typescript
interface VideoPlayerProps {
  lessonId: string;
  courseId: string;
  onLessonComplete?: () => void;      // Callback when lesson marked complete
  onCourseComplete?: () => void;      // Callback when course 100% complete (for upsell modal)
}

export function VideoPlayer({ lessonId, courseId, onLessonComplete, onCourseComplete }: VideoPlayerProps) {
  // Implementation
}
```

**Key responsibilities:**
- Fetch signed video URL from `GET /api/lessons/:lessonId/video-url`
- Render video player with controls (play, pause, seek, volume, fullscreen)
- Track watch progress (current time, duration)
- Detect 90% completion → Mark lesson complete
- Detect 100% course completion → Show celebration + trigger callback
- Handle URL expiration (refetch if needed)
- Show loading states and error states

### 2. Video Player Library
**Library:** `react-player` v3 (latest)

**Installation:**
```json
// frontend/package.json
{
  "dependencies": {
    "react-player": "^3.0.0"
  }
}
```

**Why react-player v3:**
- Lightweight and simple API
- Supports MP4 URLs (CloudFront)
- Built-in progress tracking
- TypeScript support
- Good for MVP (no complex features needed)

### 3. Video Player Implementation Pattern

**State management:**
```typescript
const [videoUrl, setVideoUrl] = useState<string | null>(null);
const [expiresAt, setExpiresAt] = useState<number | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
const [showCompleteOverlay, setShowCompleteOverlay] = useState(false);
const [showCelebration, setShowCelebration] = useState(false);
```

**Fetch video URL on mount:**
```typescript
useEffect(() => {
  async function fetchVideoUrl() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/lessons/${lessonId}/video-url`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load video');
      }

      const data = await response.json();
      setVideoUrl(data.videoUrl);
      setExpiresAt(data.expiresAt);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  fetchVideoUrl();
}, [lessonId]);
```

**Track progress and mark complete:**
```typescript
const handleProgress = useCallback(async (state: { played: number }) => {
  // 1. Check if 90% watched
  if (state.played >= 0.9 && !hasMarkedComplete) {
    setHasMarkedComplete(true);  // Prevent duplicate calls

    // 2. Call progress API
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseId, lessonId })
      });

      const data = await response.json();

      // 3. Show lesson complete overlay
      setShowCompleteOverlay(true);
      setTimeout(() => setShowCompleteOverlay(false), 3000);

      // 4. Check if course 100% complete
      if (data.percentage === 100) {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          onCourseComplete?.();  // Trigger parent callback (upsell modal)
        }, 3000);
      } else {
        // Just lesson complete, not full course
        onLessonComplete?.();
      }
    } catch (err) {
      console.error('Failed to mark lesson complete:', err);
      setHasMarkedComplete(false);  // Allow retry
    }
  }

  // 5. Check URL expiration (refetch if < 2 minutes remaining)
  const now = Math.floor(Date.now() / 1000);
  if (expiresAt && (expiresAt - now) < 120) {
    // Refetch URL logic here
  }
}, [hasMarkedComplete, courseId, lessonId, expiresAt, onLessonComplete, onCourseComplete]);
```

**Render video player:**
```typescript
return (
  <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
    {isLoading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div>Loading video...</div>
      </div>
    )}

    {error && (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="text-red-500">{error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )}

    {videoUrl && (
      <ReactPlayer
        url={videoUrl}
        controls
        width="100%"
        height="100%"
        onProgress={handleProgress}
        progressInterval={30000}  // Check every 30 seconds (debouncing)
      />
    )}

    {/* Lesson complete overlay (simple) */}
    {showCompleteOverlay && !showCelebration && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
        <div className="text-white text-2xl font-bold">✓ Lesson Complete</div>
      </div>
    )}

    {/* Course 100% complete celebration (confetti) */}
    {showCelebration && (
      <>
        <Confetti width={width} height={height} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-none">
          <div className="text-white text-3xl font-bold">
            🎉 Course Complete! 🎉
          </div>
        </div>
      </>
    )}
  </div>
);
```

### 4. Celebration UI (100% Course Completion Only)
**When to show:**
- ONLY when `POST /api/progress` response has `percentage === 100`
- NOT shown for individual lesson completion (just simple checkmark)

**What to show:**
- Confetti animation overlay using `react-confetti`
- "🎉 Course Complete! 🎉" message
- Display for 3 seconds
- Then trigger `onCourseComplete()` callback → Parent shows premium upsell modal

**Implementation:**
```typescript
import Confetti from 'react-confetti';

{showCelebration && (
  <>
    <Confetti width={width} height={height} />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-white text-3xl font-bold">
        🎉 Course Complete! 🎉
      </div>
    </div>
  </>
)}
```

**Why react-confetti:**
- Simple integration
- Looks professional
- Lightweight library
- Good celebration UX for course completion milestone

### 5. Error Handling
**Error scenarios:**
- 403 Forbidden (not enrolled) → "Please enroll to watch this lesson"
- 404 Not Found (lesson doesn't exist) → "Lesson not available"
- Network error (API down) → "Failed to load video" with retry button
- Video won't play (codec issue) → "Video format not supported"

## What We're NOT Doing
- No video resume (save playback position) - always starts from 00:00
- No watch time analytics (how long spent on each section)
- No playback speed control customization (use browser default)
- No video quality selection (single quality MP4)
- No video download button
- No picture-in-picture mode (use browser default if supported)
- No subtitles/captions
- No keyboard shortcuts beyond browser defaults
- No per-lesson celebration (only celebrate 100% course completion)

## Acceptance Criteria

### Video Player Component
- [ ] Component fetches signed video URL on mount
- [ ] Video plays CloudFront URL successfully
- [ ] Video always starts from 00:00 (no resume feature)
- [ ] Shows loading state while fetching URL
- [ ] Shows error state if URL fetch fails
- [ ] Video player has standard controls (play, pause, seek, volume, fullscreen)

### Progress Tracking
- [ ] Calls `POST /api/progress` when video reaches 90% watched
- [ ] Only calls API once per lesson (uses `hasMarkedComplete` flag)
- [ ] `onProgress` callback debounced to every 30 seconds
- [ ] `onLessonComplete` callback triggered after successful progress save

### Course Completion Detection
- [ ] Checks `percentage` field in progress API response
- [ ] If `percentage === 100` → Shows celebration overlay with confetti
- [ ] Uses `react-confetti` for celebration animation
- [ ] Celebration displays for 3 seconds
- [ ] After celebration → Triggers `onCourseComplete` callback
- [ ] Regular lessons (not 100%) → Simple "Lesson Complete" overlay, no confetti

### URL Expiration Handling
- [ ] Checks `expiresAt` timestamp
- [ ] Refetches URL when < 2 minutes remaining (optional for MVP)
- [ ] Graceful error if URL expires during playback

### UI/UX
- [ ] Video player responsive (16:9 aspect ratio)
- [ ] Shows "✓ Lesson Complete" overlay for 3 seconds (non-blocking)
- [ ] Shows "🎉 Course Complete! 🎉" with confetti ONLY at 100%
- [ ] Loading spinner while video buffers
- [ ] Error message with retry button if fetch fails

### Testing
- [ ] Unit test: Progress tracking at 90% (mock API calls)
- [ ] Unit test: Doesn't call API twice for same lesson
- [ ] Unit test: Celebrates only when `percentage === 100`
- [ ] E2E test: Complete lesson → Verify simple overlay (no confetti)
- [ ] E2E test: Complete final lesson → Verify confetti celebration
- [ ] E2E test: Error handling (401, 403, 404 responses)

## Do / Don't Examples

### DO: Show Celebration ONLY at 100% Course Completion
```typescript
// ✅ GOOD: Check percentage from API response
const data = await saveProgress();
if (data.percentage === 100) {
  showCelebration();  // Confetti with react-confetti!
  onCourseComplete();
} else {
  showSimpleCheckmark();  // Just "✓ Lesson Complete"
  onLessonComplete();
}
```

### DON'T: Celebrate Every Lesson
```typescript
// ❌ BAD: Confetti for every lesson (annoying UX)
const data = await saveProgress();
showCelebration();  // Don't celebrate lesson-1 of 5!
```

### DO: Prevent Duplicate Progress Calls
```typescript
// ✅ GOOD: Track completion state, only call API once
const [hasMarkedComplete, setHasMarkedComplete] = useState(false);

if (played >= 0.9 && !hasMarkedComplete) {
  setHasMarkedComplete(true);
  await markComplete();
}
```

### DON'T: Call Progress API Repeatedly
```typescript
// ❌ BAD: Called every time onProgress fires (every 30s after 90%)
if (played >= 0.9) {
  await markComplete();  // No guard! Called many times
}
```

### DO: Always Start Video from Beginning
```typescript
// ✅ GOOD: Simple - no state to manage
<ReactPlayer
  url={videoUrl}
  controls
  // No 'played' or 'seek' props - always starts at 0:00
/>
```

### DON'T: Try to Resume Playback
```typescript
// ❌ BAD: Adds complexity for MVP
const [savedPosition, setSavedPosition] = useState(0);
<ReactPlayer
  url={videoUrl}
  controls
  played={savedPosition}  // Don't do this for MVP
/>
```

### DO: Debounce Progress Checks
```typescript
// ✅ GOOD: Only check progress every 30 seconds
<ReactPlayer
  onProgress={handleProgress}
  progressInterval={30000}  // 30 seconds
/>
```

### DON'T: Check Progress Too Frequently
```typescript
// ❌ BAD: Fires too often, wastes CPU
<ReactPlayer
  onProgress={handleProgress}
  progressInterval={1000}  // Every second!
/>
```

## Forward-Looking Requirements

### For Slice 1.5 (Course Lesson UI)
**Integration points:**
- Course page renders `<VideoPlayer lessonId={...} courseId={...} />`
- Parent provides `onLessonComplete` callback to refetch lesson list (update checkmarks)
- Parent provides `onCourseComplete` callback to show premium upsell modal
- Parent should display current lesson title above video player

**Layout:**
```typescript
// In course page
<div>
  <h2>{currentLesson.title}</h2>
  <VideoPlayer
    lessonId={currentLesson.lessonId}
    courseId={course.courseId}
    onLessonComplete={() => refetchProgress()}
    onCourseComplete={() => setShowPremiumModal(true)}
  />
</div>
```

### For Phase 3 (Premium Upsell Modal)
**Course completion flow:**
1. Student completes final lesson → Video player shows celebration
2. After 3 seconds → `onCourseComplete()` triggered
3. Parent component sets `showPremiumModal = true`
4. Modal slides in with premium course CTA and early access signup

### For Future Video Features
Player can be extended with:
- **Resume playback:** Save `currentTime` to DynamoDB, load on mount
- **Playback speed:** 0.5x, 1x, 1.25x, 1.5x, 2x controls
- **Subtitles/Captions:** WebVTT file support
- **Watch time analytics:** Track actual seconds watched
- **Quality selection:** 1080p, 720p, 480p (if multi-quality videos available)
- **Chapter markers:** Skip to specific sections
- **Picture-in-picture:** Continue watching while browsing

## Component API

**Props:**
```typescript
interface VideoPlayerProps {
  lessonId: string;                   // Required: Which lesson to play
  courseId: string;                   // Required: Which course (for progress tracking)
  onLessonComplete?: () => void;      // Optional: Called when lesson marked complete
  onCourseComplete?: () => void;      // Optional: Called when course 100% complete
  onError?: (error: Error) => void;   // Optional: Error callback
  autoPlay?: boolean;                 // Optional: Auto-play on mount (default: false)
}
```

**Example usage:**
```typescript
// In course page component
<VideoPlayer
  lessonId="lesson-5"
  courseId="spec-driven-dev-mini"
  onLessonComplete={() => {
    // Refetch progress to update UI
    refetchProgress();
  }}
  onCourseComplete={() => {
    // Show premium upsell modal
    setShowPremiumModal(true);
  }}
/>
```

## Dependencies

**Add to `frontend/package.json`:**
```json
{
  "dependencies": {
    "react-player": "^3.0.0",
    "react-confetti": "^6.1.0"
  }
}
```

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May adjust 90% threshold (e.g., 85% or 95%) based on user feedback
- May reduce `progressInterval` to 15 seconds (more responsive completion)
- May add basic resume feature if users strongly request it
- May add celebratory sound effect with confetti animation
