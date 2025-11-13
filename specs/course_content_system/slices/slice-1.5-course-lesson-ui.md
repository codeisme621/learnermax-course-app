# Slice 1.5: Course Lesson UI

**Parent Mainspec:** `specs/course_content_system/mainspec.md`
**Status:** Not Started
**Depends On:**
- Slice 1.3 (Progress Tracking API - needs lesson and progress endpoints)
- Slice 1.4 (Video Player Component - needs `<VideoPlayer />`)

## Objective
Replace the mock curriculum data in `/course/[courseId]/page.tsx` with real lesson data fetched from the backend. Integrate the VideoPlayer component and display student progress with completion checkmarks and percentage indicators.

## User Flow Narrative

**Student lands on course page:**
1. Student navigates to `/course/spec-driven-dev-mini` (already enrolled)
2. Frontend calls two APIs in parallel:
   - `GET /api/courses/spec-driven-dev-mini/lessons` → Returns 5 lessons
   - `GET /api/progress/spec-driven-dev-mini` → Returns `{ completedLessons: ["lesson-1"], percentage: 20, lastAccessedLesson: "lesson-1" }`
3. Page renders with:
   - Video player showing `lastAccessedLesson` (lesson-1) OR first uncompleted lesson (lesson-2)
   - Lesson list sidebar showing all 5 lessons (desktop) or hamburger menu (mobile)
   - Lesson-1 has checkmark ✓ (completed)
   - Lesson-2 highlighted with "Resume here" badge (next uncompleted)
   - Progress bar in header: "20% Complete • 1 of 5 lessons"
   - "Next Lesson" button below video player

**Student clicks a different lesson:**
1. Student clicks "Lesson 3: Context Engineering Basics"
2. Video player unmounts (lesson-1 video stops)
3. Video player remounts with `lessonId="lesson-3"`
4. New video URL fetched and plays
5. URL updates to `/course/spec-driven-dev-mini?lesson=lesson-3` (for deep linking)
6. Lesson data cached in client (no refetch on navigation)

**Student completes a lesson:**
1. Student watches lesson-2 to 90%
2. VideoPlayer calls `POST /api/progress` → Returns updated progress
3. VideoPlayer triggers `onLessonComplete()` callback
4. Parent component refetches progress: `GET /api/progress/spec-driven-dev-mini`
5. UI updates:
   - Lesson-2 now shows checkmark ✓
   - Progress bar updates: "40% Complete • 2 of 5 lessons"
   - Next uncompleted lesson (lesson-3) gets "Resume here" badge
   - "Next Lesson" button updates to point to lesson-3

**Student clicks "Next Lesson" button:**
1. Student clicks "Next Lesson" button below video
2. Page navigates to next lesson in sequence
3. Video player switches to next lesson automatically
4. Sidebar updates to highlight new lesson

**Student completes final lesson:**
1. Student watches lesson-5 to 90%
2. VideoPlayer detects `percentage === 100` → Shows confetti celebration
3. After 3 seconds → VideoPlayer triggers `onCourseComplete()`
4. Parent shows premium upsell modal (Phase 3 feature - just placeholder for now)
5. "Next Lesson" button replaced with "View Certificate" or "Explore More Courses"

**Mobile user opens lesson sidebar:**
1. Student taps hamburger menu icon (top right)
2. Sidebar slides in from right side with lesson list
3. Student selects lesson → Sidebar closes, video switches
4. No footer with percentage on mobile (cleaner UX)

**Key design decisions from flow:**
- **Remove mock data** - All lesson data comes from API
- **Auto-select lesson** - Show `lastAccessedLesson` or first uncompleted on page load
- **Real-time progress updates** - UI reflects completion immediately
- **Client-side caching** - Lesson data cached to avoid refetching
- **Next.js Suspense** - Skeleton loading states while fetching
- **Next Lesson button** - Easy navigation to next lesson
- **Mobile hamburger menu** - Sidebar triggered by menu icon on mobile

## What We're Doing

### 1. Update Course Page Component
**File to modify:** `frontend/app/course/[courseId]/page.tsx`

**Current state (today):**
```typescript
// Lines 68-74 (mock data)
const mockModules = [
  { id: 1, title: 'Introduction to the Course', lessons: 5, completed: 0, duration: '45 min' },
  // ...
];
```

**After this change:**
```typescript
// Fetch real data from API
const lessons = await fetchLessons(courseId);
const progress = await fetchProgress(courseId);

// Determine which lesson to show in video player
const currentLesson = lessons.find(l => l.lessonId === searchParams.lesson)
  || lessons.find(l => l.lessonId === progress.lastAccessedLesson)
  || lessons.find(l => !progress.completedLessons.includes(l.lessonId))
  || lessons[0];  // Fallback to first lesson
```

### 2. Lesson Fetching Logic
**New file (or existing actions file):** `frontend/app/actions/lessons.ts`

```typescript
interface Lesson {
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  lengthInMins?: number;
  order: number;
}

interface Progress {
  courseId: string;
  completedLessons: string[];
  lastAccessedLesson?: string;
  percentage: number;
  totalLessons: number;
  updatedAt: string;
}

export async function fetchLessons(courseId: string): Promise<Lesson[]> {
  const response = await fetch(`/api/courses/${courseId}/lessons`, {
    next: { revalidate: 300 }  // Cache for 5 minutes
  });
  const data = await response.json();
  return data.lessons;
}

export async function fetchProgress(courseId: string): Promise<Progress> {
  const response = await fetch(`/api/progress/${courseId}`, {
    next: { revalidate: 60 }  // Cache for 1 minute (updates more frequently)
  });
  return response.json();
}
```

### 3. Course Page Layout Structure with Suspense

**Updated layout:**
```typescript
export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const { courseId } = await params;

  return (
    <div className="min-h-screen">
      {/* Course Header */}
      <Suspense fallback={<CourseHeaderSkeleton />}>
        <CourseHeader courseId={courseId} />
      </Suspense>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Video Player */}
          <Suspense fallback={<VideoPlayerSkeleton />}>
            <CourseVideoSection courseId={courseId} searchParams={searchParams} />
          </Suspense>

          {/* Sidebar - Desktop only */}
          <div className="hidden lg:block lg:col-span-1">
            <Suspense fallback={<LessonListSkeleton />}>
              <LessonListSidebar courseId={courseId} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Menu */}
      <MobileLessonMenu courseId={courseId} />
    </div>
  );
}
```

### 4. Course Header Component
**New file:** `frontend/components/CourseHeader.tsx`

**Responsibilities:**
- Display course name
- Show overall progress bar
- Show completion percentage
- "Back to Dashboard" link
- Desktop: Always visible
- Mobile: No progress footer, just header

```typescript
export async function CourseHeader({ courseId }: { courseId: string }) {
  const [course, progress] = await Promise.all([
    getCourse(courseId),
    fetchProgress(courseId),
  ]);

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Back button */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>

          {/* Course name (center on mobile) */}
          <h1 className="text-lg font-bold truncate flex-1 text-center sm:text-left sm:ml-4">
            {course.name}
          </h1>

          {/* Progress (desktop only) */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {progress.completedLessons.length} of {progress.totalLessons}
            </span>
            <Progress value={progress.percentage} className="w-32" />
            <span className="text-sm font-semibold">{progress.percentage}%</span>
          </div>

          {/* Mobile: Hamburger menu trigger */}
          <button className="lg:hidden">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
```

### 5. Course Video Section with Next Lesson Button
**New component:** `frontend/components/CourseVideoSection.tsx`

```typescript
'use client';

export function CourseVideoSection({ courseId, searchParams }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    // Fetch and cache lessons
    fetchLessons(courseId).then(setLessons);
    fetchProgress(courseId).then(setProgress);
  }, [courseId]);

  useEffect(() => {
    if (lessons.length && progress) {
      const lesson = determineCurrentLesson(lessons, progress, searchParams);
      setCurrentLesson(lesson);
    }
  }, [lessons, progress, searchParams]);

  const handleLessonComplete = async () => {
    const updated = await fetchProgress(courseId);
    setProgress(updated);
  };

  const getNextLesson = () => {
    if (!currentLesson || !lessons.length) return null;
    const currentIndex = lessons.findIndex(l => l.lessonId === currentLesson.lessonId);
    return lessons[currentIndex + 1] || null;
  };

  const nextLesson = getNextLesson();

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Lesson title */}
      <h2 className="text-2xl font-bold">{currentLesson?.title}</h2>

      {/* Video player */}
      <VideoPlayer
        lessonId={currentLesson.lessonId}
        courseId={courseId}
        onLessonComplete={handleLessonComplete}
        onCourseComplete={() => {
          // TODO: Show premium upsell modal (Phase 3)
          console.log('Course complete!');
        }}
      />

      {/* Next Lesson button */}
      {nextLesson && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Up Next</p>
            <p className="font-medium">{nextLesson.title}</p>
          </div>
          <Link href={`/course/${courseId}?lesson=${nextLesson.lessonId}`}>
            <Button>
              Next Lesson <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Lesson description */}
      {currentLesson?.description && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">About this lesson</h3>
          <p className="text-muted-foreground">{currentLesson.description}</p>
        </div>
      )}
    </div>
  );
}
```

### 6. Lesson List Sidebar Component
**New file:** `frontend/components/LessonListSidebar.tsx`

**Desktop:** Always visible in right column
**Mobile:** Hidden, accessed via hamburger menu

```typescript
interface LessonListSidebarProps {
  courseId: string;
  isMobile?: boolean;  // For mobile menu variant
}

export async function LessonListSidebar({ courseId, isMobile = false }: LessonListSidebarProps) {
  const [lessons, progress] = await Promise.all([
    fetchLessons(courseId),
    fetchProgress(courseId),
  ]);

  return (
    <Card className={cn("p-6", isMobile && "h-full")}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        Course Lessons
      </h3>

      <div className="space-y-2">
        {lessons.map((lesson) => {
          const isCompleted = progress.completedLessons.includes(lesson.lessonId);
          const isResume = lesson.lessonId === progress.lastAccessedLesson && !isCompleted;

          return (
            <Link
              key={lesson.lessonId}
              href={`/course/${courseId}?lesson=${lesson.lessonId}`}
              className={cn(
                "block p-3 rounded-lg transition-colors hover:bg-muted"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {isCompleted && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {isResume && (
                      <Badge variant="secondary" className="text-xs">Resume</Badge>
                    )}
                    <span className="text-sm font-medium">
                      {lesson.order}. {lesson.title}
                    </span>
                  </div>
                  {lesson.lengthInMins && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-6">
                      <Clock className="w-3 h-3" />
                      <span>{lesson.lengthInMins} min</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Progress summary */}
      <div className="mt-6 pt-6 border-t">
        <div className="text-sm text-muted-foreground mb-2">
          Course Progress
        </div>
        <Progress value={progress.percentage} className="h-2 mb-2" />
        <div className="flex justify-between text-sm">
          <span>{progress.completedLessons.length} of {progress.totalLessons} lessons</span>
          <span className="font-semibold">{progress.percentage}%</span>
        </div>
      </div>
    </Card>
  );
}
```

### 7. Mobile Hamburger Menu
**New component:** `frontend/components/MobileLessonMenu.tsx`

**Mobile only:** Slide-in drawer with lesson list

```typescript
'use client';

export function MobileLessonMenu({ courseId }: { courseId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger button (in header) */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Slide-in drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-background z-50 lg:hidden shadow-xl overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Lessons</h2>
              <button onClick={() => setIsOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <LessonListSidebar courseId={courseId} isMobile />
            </div>
          </div>
        </>
      )}
    </>
  );
}
```

### 8. Skeleton Loading States
**Loading components:**

```typescript
// CourseHeaderSkeleton
export function CourseHeaderSkeleton() {
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </header>
  );
}

// VideoPlayerSkeleton
export function VideoPlayerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="w-full aspect-video" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

// LessonListSkeleton
export function LessonListSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </Card>
  );
}
```

### 9. Client-Side Caching Strategy
**Use React Query or SWR for caching:**

```typescript
// Option 1: Using SWR
import useSWR from 'swr';

function useLessons(courseId: string) {
  const { data, error } = useSWR(
    `/api/courses/${courseId}/lessons`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }  // 5 min cache
  );
  return { lessons: data?.lessons, isLoading: !error && !data, error };
}

// Option 2: Using Next.js cache directly (simpler for MVP)
const cachedFetchLessons = cache(async (courseId: string) => {
  // Fetches once per request, cached in memory
  return fetchLessons(courseId);
});
```

## What We're NOT Doing
- No module hierarchy display (flat lesson list only)
- No lesson search/filter
- No "Mark as complete" button (only via video watching)
- No manual progress reset
- No lesson notes or bookmarks
- No download lesson resources
- No lesson preview (can only watch if enrolled)
- No premium upsell modal implementation (placeholder only - Phase 3)
- No progress footer on mobile (cleaner mobile UX)

## Acceptance Criteria

### Data Fetching & Caching
- [ ] Remove all `mockModules` hardcoded data
- [ ] Fetch lessons from `GET /api/courses/:courseId/lessons`
- [ ] Fetch progress from `GET /api/progress/:courseId`
- [ ] Both API calls made in parallel on page load
- [ ] Lesson data cached in client (Next.js cache or SWR)
- [ ] Skeleton loading states shown via Suspense

### Lesson Display
- [ ] All lessons displayed in sidebar ordered by `order` field
- [ ] Each lesson shows title and duration
- [ ] Completed lessons show checkmark ✓
- [ ] `lastAccessedLesson` shows "Resume" badge (if not completed)
- [ ] Desktop: Sidebar always visible
- [ ] Mobile: Sidebar in hamburger menu (slide-in drawer)

### Video Player Integration
- [ ] VideoPlayer component rendered with current lesson
- [ ] Clicking lesson in sidebar switches video
- [ ] URL updates with `?lesson=` query param
- [ ] VideoPlayer `onLessonComplete` callback refetches progress
- [ ] UI updates immediately after lesson completion

### Next Lesson Button
- [ ] "Next Lesson" button shown below video player
- [ ] Button displays next lesson title
- [ ] Clicking button navigates to next lesson
- [ ] Button hidden on last lesson OR shows "Explore More Courses"

### Course Header
- [ ] Header shows course name
- [ ] Header shows "Back to Dashboard" link
- [ ] Desktop: Shows progress bar and percentage
- [ ] Mobile: No progress display in header (cleaner)
- [ ] Header sticky on scroll

### Progress Display
- [ ] Sidebar shows completion count: "2 of 5 lessons"
- [ ] Sidebar shows percentage: "40%"
- [ ] Progress bar fills correctly based on percentage
- [ ] Mobile: No progress footer (only in sidebar via hamburger menu)

### Course Completion
- [ ] VideoPlayer `onCourseComplete` callback triggered at 100%
- [ ] Placeholder action for premium upsell (console.log or alert)
- [ ] All lessons show checkmarks when course complete

### Testing
- [ ] E2E test: Load course page → See real lessons (not mock data)
- [ ] E2E test: Click lesson → Video player switches
- [ ] E2E test: Complete lesson → Checkmark appears
- [ ] E2E test: Click "Next Lesson" → Navigates correctly
- [ ] E2E test: Mobile → Open hamburger menu → Select lesson
- [ ] E2E test: Complete all lessons → 100% progress shown
- [ ] Unit test: Determine current lesson logic

## Do / Don't Examples

### DO: Use Suspense for Loading States
```typescript
// ✅ GOOD: Next.js Suspense with skeleton
<Suspense fallback={<LessonListSkeleton />}>
  <LessonListSidebar courseId={courseId} />
</Suspense>
```

### DON'T: Manual Loading State Management
```typescript
// ❌ BAD: More code, harder to maintain
{isLoading && <Spinner />}
{!isLoading && <LessonListSidebar />}
```

### DO: Cache Lesson Data
```typescript
// ✅ GOOD: Next.js automatic caching
const response = await fetch(`/api/lessons`, {
  next: { revalidate: 300 }  // Cache 5 min
});
```

### DON'T: Refetch on Every Navigation
```typescript
// ❌ BAD: No caching, slow page transitions
const response = await fetch(`/api/lessons`, {
  cache: 'no-store'  // Always fetch fresh
});
```

### DO: Show Next Lesson Button
```typescript
// ✅ GOOD: Easy navigation
{nextLesson && (
  <Button onClick={() => navigateToLesson(nextLesson.lessonId)}>
    Next: {nextLesson.title}
  </Button>
)}
```

### DON'T: Make Users Go Back to Sidebar
```typescript
// ❌ BAD: Extra clicks required
// No next lesson button - user must open sidebar to continue
```

### DO: Mobile Hamburger Menu
```typescript
// ✅ GOOD: Slide-in drawer for mobile
<div className="lg:hidden">
  <button onClick={openMenu}><Menu /></button>
  <Drawer isOpen={isOpen}>
    <LessonListSidebar />
  </Drawer>
</div>
```

### DON'T: Show Progress Footer on Mobile
```typescript
// ❌ BAD: Takes up screen space
<footer className="fixed bottom-0 md:hidden">
  Progress: 40%
</footer>
```

## Forward-Looking Requirements

### For Phase 2 (Mini Course Content)
**Lesson creation:**
- When creating lessons in DynamoDB, ensure `order` field is sequential (1, 2, 3, 4, 5)
- Lesson titles should be descriptive and match video content
- `lengthInMins` should match actual video duration

### For Phase 3 (Premium Upsell Modal)
**Course completion handler:**
```typescript
const [showPremiumModal, setShowPremiumModal] = useState(false);

<VideoPlayer
  onCourseComplete={() => setShowPremiumModal(true)}
/>

{showPremiumModal && (
  <PremiumUpsellModal onClose={() => setShowPremiumModal(false)} />
)}
```

### For Future Features
- **Lesson preview:** Show first 2 minutes without enrollment
- **Downloadable resources:** PDFs, code samples per lesson
- **Lesson notes:** Student notes while watching
- **Bookmarks:** Save specific video timestamps
- **Discussions:** Q&A per lesson
- **Module grouping:** Display lessons in modules
- **Auto-play:** Auto-advance to next lesson

## Layout Reference

**Desktop layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Header: ← Dashboard    Course Name    [Progress] 40%   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌─────────────────────┐ │
│  │ Lesson 2: Writing Specs  │  │ Course Lessons      │ │
│  ├──────────────────────────┤  ├─────────────────────┤ │
│  │                          │  │ ✓ 1. Intro          │ │
│  │   Video Player           │  │ ► 2. Specs (Now)    │ │
│  │   (16:9 aspect)          │  │   3. Context        │ │
│  │                          │  │   4. Examples       │ │
│  └──────────────────────────┘  │   5. Recap          │ │
│  ┌──────────────────────────┐  ├─────────────────────┤ │
│  │ Up Next: Lesson 3        │  │ Progress: 2/5       │ │
│  │ [Next Lesson →]          │  │ [████░░] 40%        │ │
│  └──────────────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Mobile layout:**
```
┌──────────────────┐
│ ← Dashboard  ☰   │  ← Header (no progress)
├──────────────────┤
│ Lesson 2: Specs  │
├──────────────────┤
│                  │
│  Video Player    │
│  (Full width)    │
│                  │
├──────────────────┤
│ Up Next: Less 3  │
│ [Next Lesson →]  │
└──────────────────┘

When ☰ clicked → Slide-in drawer from right with lesson list
```

## Component File Structure

**New/Modified files:**
```
frontend/
├── app/
│   ├── actions/
│   │   └── lessons.ts                   # NEW: fetchLessons, fetchProgress
│   └── course/
│       └── [courseId]/
│           └── page.tsx                  # MODIFIED: Remove mock, use Suspense
├── components/
│   ├── VideoPlayer.tsx                   # From Slice 1.4
│   ├── CourseHeader.tsx                  # NEW: Header with progress
│   ├── CourseVideoSection.tsx            # NEW: Video + Next button
│   ├── LessonListSidebar.tsx             # NEW: Lesson list with progress
│   ├── MobileLessonMenu.tsx              # NEW: Hamburger menu drawer
│   └── skeletons/
│       ├── CourseHeaderSkeleton.tsx      # NEW: Loading state
│       ├── VideoPlayerSkeleton.tsx       # NEW: Loading state
│       └── LessonListSkeleton.tsx        # NEW: Loading state
```

## Deviations from Plan
_(To be filled during implementation)_

Potential considerations:
- May use SWR instead of Next.js cache for more control
- May adjust skeleton designs based on actual component layout
- May add transition animations for lesson switching
- May add "Previous Lesson" button alongside "Next Lesson"
